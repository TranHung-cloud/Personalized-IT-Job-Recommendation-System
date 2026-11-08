from playwright.sync_api import sync_playwright
import time
import json
import re
import pandas as pd
from datetime import date
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import requests
from pprint import pprint

from crawl.browser_interact import (
    create_browser_context,
    wait_and_scroll
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)
from crawl.config import (
    TOPCV_URL,
    VIETNAMWORKS_URL,
    ITVIEC_URL,
    PROXY_MODE,
    MODE,
    MAX_RETRIES,
    MAX_NEXT_REDIRECTS
)
from crawl.database import (
    execute_query,
    close_connection,
    pool,
    save_raw_jd_to_bucket,
)
from crawl.jd_parser import (
    normalize_string,
    parse_experience,
    parse_education,
    convert_to_vnd,
    format_date,
    normalize_company,
    html_to_text,
)
from crawl.matcher import (
    build_raw_lookup,
    dictionary_match,
    match_raw_names,
)

class NextRedirectError(ValueError):
    def __init__(self, target_url):
        self.target_url = target_url
        super().__init__(f"VietnamWorks NEXT_REDIRECT tới {target_url}")

TYPE_WORKING_MAP = {
    1: "Toàn thời gian",
    2: "Bán thời gian",
    3: "Thực tập",
    4: "Nghề tự do",
    5: "Hợp đồng thời vụ",
    6: "Khác",
    7: "Việc làm online",
}

SOURCE_STATUS_PENDING = "pending"
SOURCE_STATUS_CRAWLED = "crawled"
SOURCE_STATUS_ERROR = "error"
SOURCE_STATUS_DUPLICATE = "duplicate"

def _unique_matches(matches):
    unique = []
    seen = set()
    for item in matches or []:
        item_id = item.get("id")
        key = ("id", item_id) if item_id is not None else ("name", item.get("name"))
        if key not in seen:
            unique.append(item)
            seen.add(key)
    return unique

def extract_next_f(html):
    soup = BeautifulSoup(html, "html.parser")
    chunks = []

    for script in soup.find_all("script"):
        content = script.string or script.get_text()
        if not content or "self.__next_f.push" not in content:
            continue

        for match in re.finditer(
            r'self\.__next_f\.push\(\[\s*(\d+)\s*,\s*("(?:\\.|[^"\\])*")\s*\]\)',
            content,
        ):
            if int(match.group(1)) == 1:
                chunks.append(json.loads(match.group(2)))

    return "".join(chunks)

def extract_job_data(html):
    flight_data = extract_next_f(html)
    decoder = json.JSONDecoder()

    def decode_reference(reference):
        marker = re.search(rf"(?<![\w]){re.escape(reference)}:(?=\s*\{{)", flight_data)
        if not marker:
            return None
        try:
            value, _ = decoder.raw_decode(flight_data, marker.end())
            return value
        except json.JSONDecodeError:
            return None

    job_ref = re.search(r'"jobDetail"\s*:\s*"\$(\w+)"', flight_data)
    job = decode_reference(job_ref.group(1)) if job_ref else None

    if not isinstance(job, dict) or not job.get("jobTitle"):
        job = None
        for marker in re.finditer(r"(?m)^([a-zA-Z0-9]+):(?=\{)", flight_data):
            try:
                candidate, _ = decoder.raw_decode(flight_data, marker.end())
            except json.JSONDecodeError:
                continue
            if isinstance(candidate, dict) and candidate.get("jobId") and candidate.get("jobTitle"):
                job = candidate
                break

    if not job:
        redirect_match = re.search(
            r"NEXT_REDIRECT;(?:replace|push);([^;]+);\d+;?",
            flight_data,
        )
        if redirect_match:
            raise NextRedirectError(redirect_match.group(1))
        raise ValueError("Không tìm thấy jobDetail trong dữ liệu Next.js")

    def resolve(value, resolving=None):
        if resolving is None:
            resolving = set()
        if isinstance(value, list):
            return [resolve(item, resolving) for item in value]
        if isinstance(value, dict):
            return {key: resolve(item, resolving) for key, item in value.items()}
        if not isinstance(value, str):
            return value

        ref_match = re.fullmatch(r"\$(\w+)", value)
        if not ref_match:
            return value

        ref = ref_match.group(1)
        if ref in resolving:
            return value
        definition = re.search(
            rf'(?<![\w]){re.escape(ref)}:(?=\s*(?:\[|\{{|T|"))(.*?)(?=\n[a-zA-Z0-9]+:|\Z)',
            flight_data,
            re.DOTALL,
        )
        if not definition:
            return value

        raw = definition.group(1).strip()
        text_match = re.match(r"T\w*,(.*)", raw, re.DOTALL)
        if text_match:
            return text_match.group(1)

        resolving.add(ref)
        try:
            parsed, _ = decoder.raw_decode(raw)
            return resolve(parsed, resolving)
        except (json.JSONDecodeError, TypeError):
            return resolve(raw, resolving)
        finally:
            resolving.remove(ref)

    return resolve(job)

def split_description_itviec(description):
    pattern = r"The Job|Your Skills and Experience|Why You'll Love Working Here"
    parts = re.split(pattern, description, flags=re.IGNORECASE)
    headers = [
        "Job description",
        "Your skills and experience",
        "Why you'll love working here"
    ]
    result = {}

    for i, header in enumerate(headers, start=1):
        html_content = parts[i].strip() if len(parts) > i else ""
        result[header] = html_content

    return result

def split_description_topcv(description):
    sections = {
        "Job description": [],
        "Your skills and experience": [],
        "Why you'll love working here": [],
    }
    current_section = None
    soup = BeautifulSoup(description or "", "html.parser")

    for element in soup.contents:
        if getattr(element, "name", None) == "h2":
            heading = normalize_string(element.get_text(" ", strip=True))
            if "mo ta cong viec" in heading:
                current_section = "Job description"
            elif "yeu cau ung vien" in heading:
                current_section = "Your skills and experience"
            elif "quyen loi" in heading:
                current_section = "Why you'll love working here"
            else:
                current_section = None
        elif current_section:
            sections[current_section].append(str(element))

    result = {key: "".join(parts).strip() for key, parts in sections.items()}
    if not result["Job description"]:
        result["Job description"] = description or ""
    return result

def set_source_status(src_id, status):
    execute_query(
        "UPDATE source SET src_status = %s, src_crawled_at = NOW() WHERE src_id = %s",
        (status, src_id),
    )

def save_job_to_db(job_data, raw_jd_json):
    src_raw_key = save_raw_jd_to_bucket(
        job_data["src_id"], date.today().isoformat(), raw_jd_json
    )
    job_data["pos_id"] = job_data["job_pos"].get("id") if job_data.get("job_pos") and pd.notna(job_data["job_pos"].get("id")) else None
    job_data["wm_id"] = job_data["job_wm"].get("id") if job_data.get("job_wm") and pd.notna(job_data["job_wm"].get("id")) else None
    query = """
        INSERT INTO job (
            co_id, src_id, job_title, job_title_norm,
            job_exp_max, job_exp_min,
            job_sal_min, job_sal_max, job_sal_nego,
            job_desc, job_benefit,
            job_expired_at, job_posted_at,
            pos_id, wm_id, qual_id, job_req
        ) VALUES (
            %(co_id)s, %(src_id)s, %(job_title)s, %(job_title_norm)s,
            %(job_exp_max)s, %(job_exp_min)s,
            %(job_sal_min)s, %(job_sal_max)s, %(job_sal_nego)s,
            %(job_desc)s, %(job_benefit)s,
            %(job_expired_at)s, %(job_posted_at)s,
            %(pos_id)s, %(wm_id)s, %(qual_id)s, %(job_req)s
        )
        RETURNING job_id
    """

    with pool.connection() as conn:
        existing = None
        if job_data.get("job_title_norm") and job_data.get("co_id"):
            existing = execute_query(
                """SELECT job_id FROM job
                   WHERE job_title_norm = %(job_title_norm)s
                     AND co_id = %(co_id)s
                   ORDER BY job_posted_at DESC NULLS LAST
                   LIMIT 1""",
                job_data, fetch="one", conn=conn,
            )

        if existing:
            execute_query(
                "UPDATE source SET src_status = %s, src_crawled_at = NOW() WHERE src_id = %s",
                (SOURCE_STATUS_DUPLICATE, job_data["src_id"]),
                conn=conn,
            )
            return None

        row = execute_query(query, job_data, fetch="one", conn=conn)
        job_id = row["job_id"]

        execute_query(
            """
            UPDATE source
            SET src_crawled_at = NOW(),
            src_status = %s,
            pos_raw_name = %s,
            wm_raw_name = %s,
            src_raw_key = %s
            WHERE src_id = %s
            """,
            (SOURCE_STATUS_CRAWLED,
             job_data.get("job_pos", {}).get("name") if job_data.get("job_pos") else None,
             job_data.get("job_wm", {}).get("name") if job_data.get("job_wm") else None,
             src_raw_key,
             job_data["src_id"]),
            conn=conn
        )

        for skill in job_data.get("job_skills") or []:
            execute_query(
                """
                INSERT INTO source_skill_raw
                (src_id, sk_raw_name)
                VALUES (%s, %s)
                """,
                (job_data["src_id"], skill["name"]),
                conn=conn
            )
            if skill.get("id") is not None and pd.notna(skill["id"]):
                execute_query(
                    """
                    INSERT INTO job_skill (job_id, sk_id)
                    VALUES (%s, %s)
                    """,
                    (job_id, skill["id"]),
                    conn=conn
                )

        for loc in job_data.get("job_locations") or []:
            execute_query(
                """
                INSERT INTO source_location_raw
                (src_id, loc_raw_name)
                VALUES (%s, %s)
                """,
                (job_data["src_id"], loc["name"]),
                conn=conn
            )
            if loc.get("id") is not None and pd.notna(loc["id"]):
                execute_query(
                    """
                    INSERT INTO job_location (job_id, loc_id)
                    VALUES (%s, %s)
                    """,
                    (job_id, loc["id"]),
                    conn=conn
                )
    return job_id

def crawl_itviec_job(url, page, lookup_pos, lookup_wm, lookup_loc, lookup_sk, lookup_com):
    page.goto(
        url["url"],
        wait_until="domcontentloaded",
        timeout=60000
    )
    wait_and_scroll(page)
    locator = page.locator('script[type="application/ld+json"]')
    script_content = locator.all_text_contents()
    data = None
    for script in script_content:
        try:
            candidate = json.loads(script)
            if not isinstance(candidate, dict):
                continue
            if candidate.get("@type") != "JobPosting":
                continue
            data = candidate
            # title
            title = data.get("title")
            # title norm
            title_norm = normalize_string(title) if title else None
            # posted at
            posted_at = format_date(data.get("datePosted"))
            # expired at
            expired_at = format_date(data.get("validThrough"))
            # skill
            skills_raw = data.get("skills").split(",") if data.get("skills") else None
            skills = match_raw_names(lookup_sk, skills_raw, "sk")
            # work mode
            work_mode_raw = data.get("employmentType")
            work_mode_matches = match_raw_names(
                lookup_wm, [work_mode_raw] if work_mode_raw else [], "wm"
            )
            work_mode = work_mode_matches[0] if work_mode_matches else None
            # location
            locations_raw = data.get("jobLocation")
            seen_location_inputs = set()
            location_names = []
            for loc in locations_raw or []:
                address = loc.get("address") or {}
                loc_name = address.get("addressRegion")
                if loc_name:
                    normalized_loc_name = normalize_string(loc_name)
                    if normalized_loc_name in seen_location_inputs:
                        continue
                    seen_location_inputs.add(normalized_loc_name)
                    location_names.append(loc_name)
            location_matches = match_raw_names(
                lookup_loc, location_names, "loc"
            )
            locations = _unique_matches(location_matches)
            # company
            company_raw = data.get("hiringOrganization", {}).get("name")
            company_matches = match_raw_names(
                lookup_com,
                [normalize_company(company_raw)] if company_raw else [],
                "com",
            )
            company = company_matches[0] if company_matches else None
            # salary
            salary_currency = None
            salary_min = None
            salary_max = None
            base_salary = data.get("baseSalary") or {}
            salary_currency = base_salary.get("currency") if isinstance(base_salary, dict) else None
            salary_value = base_salary.get("value") or {} if isinstance(base_salary, dict) else {}
            if not isinstance(salary_value, dict):
                salary_value = {}
            sal_min_raw = salary_value.get("minValue")
            sal_max_raw = salary_value.get("maxValue")
            if sal_min_raw and sal_max_raw:
                salary_min = convert_to_vnd(sal_min_raw, salary_currency)
                salary_max = convert_to_vnd(sal_max_raw, salary_currency)
            overview = data.get("description")

            description_sections = split_description_itviec(overview)
            description = html_to_text(
                description_sections.get("Job description")
            )
            requirement = html_to_text(
                description_sections.get("Your skills and experience")
            )
            benefits = html_to_text(
                description_sections.get("Why you'll love working here")
            )
        except json.JSONDecodeError:
            continue
    if not data or data.get("@type") != "JobPosting":
        raise ValueError("Không tìm thấy JSON-LD JobPosting hợp lệ trên trang ITviec")
    # position
    position = None
    pos_label = page.locator(
        'xpath=//div[normalize-space(translate(text(), '
        '"ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"))="job expertise:"]'
    )
    if pos_label.count() > 0:
        pos_div = pos_label.first.locator("xpath=following-sibling::div[1]")
        links = pos_div.locator("a")
        if links.count() > 0:
            pos_raw = (
                links.first.get_attribute("title")
                or links.first.inner_text().strip()
            )
            position_matches = match_raw_names(
                lookup_pos, [pos_raw], "pos"
            )
            position = position_matches[0] if position_matches else None

    # experience
    exp_range = parse_experience(requirement)
    # education
    req_edu = parse_education(requirement)
    
    raw_jd_json = {
        "title": title,
        "description": overview,
        "datePosted": posted_at,
        "dateExpired": expired_at,
        "workMode": work_mode_raw,
        "company": company_raw,
        "locations": locations_raw,
        "salaryMin": sal_min_raw,
        "salaryMax": sal_max_raw,
        "skills": skills_raw,
    }

    job_data = {
        "co_id": company["id"] if company else None,
        "src_id": url["src_id"],
        "job_title": title,
        "job_title_norm": title_norm,
        "job_exp_max": exp_range["max_months"],
        "job_exp_min": exp_range["min_months"],
        "job_sal_min": salary_min,
        "job_sal_max": salary_max,
        "job_sal_nego": not salary_min and not salary_max,
        "job_desc": description,
        "job_benefit": benefits,
        "job_expired_at": expired_at,
        "job_posted_at": posted_at,
        "job_pos": position if position else None,
        "job_wm": work_mode if work_mode else None,
        "qual_id": req_edu["qual_id"],
        "job_req": requirement,
        "job_skills": skills if skills else None,
        "job_locations": locations if locations else None,
    }

    return job_data, raw_jd_json

def crawl_topcv_job(url, page, lookup_pos, lookup_wm, lookup_loc, lookup_sk, lookup_com):
    page.goto(
        url["url"],
        wait_until="domcontentloaded",
        timeout=60000
    )
    wait_and_scroll(page)
    locator = page.locator('script[type="application/ld+json"]')
    script_content = locator.all_text_contents()
    job_posting_found = False
    for script in script_content:
        try:
            data = json.loads(script)
            if data.get("@type") != "JobPosting":
                continue
            job_posting_found = True
            # title
            title = data.get("title")
            # title norm
            title_norm = normalize_string(title) if title else None
            # posted at
            posted_at = format_date(data.get("datePosted"))
            # expired at
            expired_at = format_date(data.get("validThrough"))
            # skill
            skills_raw = data.get("skills").split(",") if data.get("skills") else []
            # work mode
            work_mode_raw = data.get("employmentType")
            work_mode_matches = match_raw_names(
                lookup_wm, [work_mode_raw] if work_mode_raw else [], "wm"
            )
            work_mode = work_mode_matches[0] if work_mode_matches else None
            # location
            locations_raw = data.get("jobLocation")
            seen_location_inputs = set()
            location_names = []
            location_items = (
                locations_raw
                if isinstance(locations_raw, list)
                else [locations_raw] if locations_raw else []
            )
            for loc in location_items:
                address = loc.get("address") or {}
                loc_name = address.get("addressRegion")
                if loc_name:
                    normalized_loc_name = normalize_string(loc_name)
                    if normalized_loc_name in seen_location_inputs:
                        continue
                    seen_location_inputs.add(normalized_loc_name)
                    location_names.append(loc_name)
            location_matches = match_raw_names(
                lookup_loc, location_names, "loc"
            )
            locations = _unique_matches(location_matches)
            # company
            company_raw = data.get("hiringOrganization", {}).get("name")
            company_matches = match_raw_names(
                lookup_com,
                [normalize_company(company_raw)] if company_raw else [],
                "com",
            )
            company = company_matches[0] if company_matches else None
            # salary
            salary_min = None
            salary_max = None
            base_salary = data.get("baseSalary") or {}
            salary_currency = base_salary.get("currency")
            salary_value = base_salary.get("value") or {}
            if not isinstance(salary_value, dict):
                salary_value = {}
            sal_min_raw = salary_value.get("minValue")
            sal_max_raw = salary_value.get("maxValue")
            if sal_min_raw and sal_max_raw:
                salary_min = convert_to_vnd(sal_min_raw, salary_currency)
                salary_max = convert_to_vnd(sal_max_raw, salary_currency)
            overview = data.get("description")
            description_sections = split_description_topcv(overview)
            description = html_to_text(description_sections["Job description"])
            requirement = html_to_text(description_sections["Your skills and experience"])
            benefits = html_to_text(data.get("jobBenefits") or description_sections[
                "Why you'll love working here"
            ])
            requirement_skill_names = dictionary_match(
                lookup_sk, requirement, "sk"
            )
            skills = match_raw_names(
                lookup_sk,
                skills_raw + requirement_skill_names,
                "sk",
            )
            break

        except json.JSONDecodeError:
            continue
    if not job_posting_found:
        raise ValueError("Không tìm thấy JSON-LD JobPosting trên trang TopCV")
    position_raw = None
    tag_groups = page.locator(".job-tags__group")
    for group_index in range(tag_groups.count()):
        tag_group = tag_groups.nth(group_index)
        group_heading = tag_group.locator(
            ".job-tags__group-name"
        ).inner_text().strip()
        head = normalize_string(group_heading).rstrip(":")
        if head not in {"chuyen mon", "specialization"}:
            continue

        links = tag_group.locator(".job-tags__group-list-tag a")
        for link_index in range(links.count()):
            link = links.nth(link_index)
            href = link.get_attribute("href") or ""
            if "domain_knowledge=" in href:
                continue
            position_raw = (
                link.get_attribute("title")
                or link.inner_text().strip()
            )
            break
        if position_raw:
            break

    position_matches = match_raw_names(
        lookup_pos, [position_raw] if position_raw else [], "pos"
    )
    position = position_matches[0] if position_matches else None

    # experience
    exp_range = parse_experience(requirement)
    if exp_range["min_months"] is None:
        experience_months = (data.get("experienceRequirements") or {}).get(
            "monthsOfExperience"
        )
        if experience_months is not None:
            exp_range["min_months"] = experience_months
    # education
    req_edu = parse_education(requirement)

    raw_jd_json = {
        "title": title,
        "description": overview,
        "datePosted": posted_at,
        "dateExpired": expired_at,
        "workMode": work_mode_raw,
        "company": company_raw,
        "locations": locations_raw,
        "salaryMin": sal_min_raw,
        "salaryMax": sal_max_raw,
        "skills": skills_raw,
    }
    job_data = {
        "co_id": company["id"] if company else None,
        "src_id": url["src_id"],
        "job_title": title,
        "job_title_norm": title_norm,
        "job_exp_max": exp_range["max_months"],
        "job_exp_min": exp_range["min_months"],
        "job_sal_min": salary_min,
        "job_sal_max": salary_max,
        "job_sal_nego": not salary_min and not salary_max,
        "job_desc": description,
        "job_benefit": benefits,
        "job_expired_at": expired_at,
        "job_posted_at": posted_at,
        "job_pos": position if position else None,
        "job_wm": work_mode if work_mode else None,
        "qual_id": req_edu["qual_id"],
        "job_req": requirement,
        "job_skills": skills if skills else None,
        "job_locations": locations if locations else None,
    }
    return job_data, raw_jd_json     

def crawl_vietnamworks_job(url, proxy, lookup_pos, lookup_wm, lookup_loc, lookup_sk, lookup_com):
    proxies = {"http": proxy, "https": proxy} if proxy else None
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        )
    }
    request_url = url["url"]
    visited_urls = {request_url}
    data = None
    response = None

    for redirect_count in range(MAX_NEXT_REDIRECTS + 1):
        response = requests.get(
            request_url,
            headers=headers,
            proxies=proxies,
            timeout=60,
            allow_redirects=True,
        )
        response.raise_for_status()
        request_url = response.url
        try:
            data = extract_job_data(response.text)
            break
        except NextRedirectError as redirect:
            if redirect_count >= MAX_NEXT_REDIRECTS:
                raise ValueError(
                    f"Vượt quá {MAX_NEXT_REDIRECTS} NEXT_REDIRECT lần"
                )

            next_url = urljoin(response.url, redirect.target_url)
            hostname = (urlparse(next_url).hostname or "").lower()
            if hostname != "vietnamworks.com" and not hostname.endswith(
                ".vietnamworks.com"
            ):
                raise ValueError(
                    f"NEXT_REDIRECT dẫn ra ngoài VietnamWorks: {next_url}"
                )
            if next_url in visited_urls:
                raise ValueError(f"Phát hiện vòng lặp NEXT_REDIRECT: {next_url}")

            print(f"[MAIN] VietnamWorks redirect: {response.url} -> {next_url}")
            visited_urls.add(next_url)
            request_url = next_url

    if data is None:
        raise ValueError("Không lấy được jobDetail sau khi theo redirect")

    title = data.get("jobTitle")
    requirement_html = data.get("jobRequirement") or ""
    description_html = data.get("jobDescription") or ""
    requirement = html_to_text(requirement_html)
    description = html_to_text(description_html)

    requirement = re.split(
        r"\n[a-zA-Z0-9]+:\s*\{\s*[\"']skillName[\"']\s*:",
        requirement,
        maxsplit=1,
    )[0]

    offers_heading = re.search(
        r"\*{0,2}\s*WHAT COMPANY OFFERS\b|(?:\\?\*){2,}\s*Chế độ của công ty\s*:",
        requirement,
        flags=re.IGNORECASE,
    )
    if offers_heading:
        requirement = requirement[:offers_heading.start()]
    requirement = requirement.strip()

    benefit_items = data.get("benefits") or []
    benefit_html = "\n".join(
        str(item.get("benefitValue") or "")
        for item in benefit_items
        if isinstance(item, dict) and item.get("benefitValue")
    )
    benefits = html_to_text(benefit_html)

    company_raw = data.get("companyName")
    company_matches = match_raw_names(
        lookup_com,
        [normalize_company(company_raw)] if company_raw else [],
        "com",
    )
    company = company_matches[0] if company_matches else None

    function = data.get("jobFunction") or {}
    position_names = [
        child.get("nameVI") or child.get("name")
        for child in function.get("children", [])
        if isinstance(child, dict) and (child.get("nameVI") or child.get("name"))
    ]
    positions = match_raw_names(lookup_pos, position_names, "pos")
    position = positions[0] if positions else None

    location_names = [
        location.get("cityNameVI") or location.get("cityName")
        for location in data.get("workingLocations") or []
        if isinstance(location, dict)
        and (location.get("cityNameVI") or location.get("cityName"))
    ]
    locations = _unique_matches(
        match_raw_names(lookup_loc, location_names, "loc")
    )

    skills_raw = [
        skill.get("skillName")
        for skill in data.get("skills") or []
        if isinstance(skill, dict) and skill.get("skillName")
    ]
    requirement_skills = dictionary_match(lookup_sk, requirement, "sk")
    skills = _unique_matches(
        match_raw_names(lookup_sk, skills_raw + requirement_skills, "sk")
    )

    type_working_id = data.get("typeWorkingId")
    try:
        type_working_id = int(type_working_id)
    except (TypeError, ValueError):
        type_working_id = None
    work_mode_raw = (
        TYPE_WORKING_MAP.get(type_working_id)
        or data.get("workMode")
        or data.get("workModeName")
    )
    work_mode_matches = match_raw_names(
        lookup_wm, [work_mode_raw] if work_mode_raw else [], "wm"
    )
    work_mode = work_mode_matches[0] if work_mode_matches else None

    salary_min_raw = data.get("salaryMin")
    salary_max_raw = data.get("salaryMax")
    salary_currency = data.get("salaryCurrency") or "VND"
    salary_visible = data.get("isSalaryVisible", True)
    salary_min = salary_max = None
    if salary_visible and (salary_min_raw or salary_max_raw):
        salary_min = convert_to_vnd(salary_min_raw, salary_currency)
        salary_max = convert_to_vnd(salary_max_raw, salary_currency)

    experience = parse_experience(requirement)
    if experience["min_months"] is None and data.get("yearsOfExperience") is not None:
        experience["min_months"] = round(float(data["yearsOfExperience"]) * 12)
    education = parse_education(requirement)

    posted_at = format_date(data.get("createdOn") or data.get("approvedOn"))
    expired_at = format_date(data.get("expiredOn"))

    raw_jd_json = {
        "title": title,
        "description": description_html,
        "requirements": requirement_html,
        "benefits": benefit_items,
        "datePosted": data.get("createdOn") or data.get("approvedOn"),
        "dateExpired": data.get("expiredOn"),
        "workMode": work_mode_raw,
        "company": company_raw,
        "locations": data.get("workingLocations"),
        "salaryMin": salary_min_raw,
        "salaryMax": salary_max_raw,
        "skills": skills_raw,
        "position": position_names,
    }

    job_data = {
        "co_id": company["id"] if company else None,
        "src_id": url["src_id"],
        "job_title": title,
        "job_title_norm": normalize_string(title) if title else None,
        "job_exp_max": experience["max_months"],
        "job_exp_min": experience["min_months"],
        "job_sal_min": salary_min,
        "job_sal_max": salary_max,
        "job_sal_nego": not salary_min and not salary_max,
        "job_desc": description,
        "job_benefit": benefits,
        "job_expired_at": expired_at,
        "job_posted_at": posted_at,
        "job_pos": position,
        "job_wm": work_mode,
        "qual_id": education["qual_id"],
        "job_req": requirement,
        "job_skills": skills or None,
        "job_locations": locations or None,
    }
    return job_data, raw_jd_json

def main():
    sources = execute_query("""
        SELECT 
            s.src_id,
            s.src_url,
            st.site_id,
            st.site_name
        FROM source s
        JOIN site st ON s.site_id = st.site_id
        WHERE s.src_status = %s
        ORDER BY s.src_id ASC
        LIMIT %s
    """, (SOURCE_STATUS_PENDING, MAX_JOBS_PER_RUN), fetch=True)
    lookup_pos = build_raw_lookup("pos")
    lookup_wm = build_raw_lookup("wm")
    lookup_loc = build_raw_lookup("loc")
    lookup_sk = build_raw_lookup("sk")
    lookup_com = build_raw_lookup("com")
    lookups = (lookup_pos, lookup_wm, lookup_loc, lookup_sk, lookup_com)
    with sync_playwright() as p:
        proxy = None
        if PROXY_MODE == MODE.PROXY:
            proxy = get_working_proxy_forever(ITVIEC_URL)
            print(f"[MAIN] Đang sử dụng proxy: {proxy}")
        context = create_browser_context(p, proxy)
        try:
            page = context.pages[0] if context.pages else context.new_page()
            for source in sources:
                source_info = {"url": source["src_url"], "src_id": source["src_id"]}
                site_name = source["site_name"].lower()
                succeeded = False
                for attempt in range(1, max(1, MAX_RETRIES) + 1):
                    try:
                        if site_name == "itviec":
                            job_data, raw_jd_json = crawl_itviec_job(source_info, page, *lookups)
                        elif site_name == "topcv":
                            job_data, raw_jd_json = crawl_topcv_job(source_info, page, *lookups)
                        elif site_name == "vietnamworks":
                            job_data, raw_jd_json = crawl_vietnamworks_job(source_info, proxy, *lookups)
                        else:
                            raise ValueError(f"Site chưa hỗ trợ: {source['site_name']}")
                        save_job_to_db(job_data, raw_jd_json)
                        print("============================================================")
                        print(site_name)
                        pprint(job_data, indent=4, width=120, sort_dicts=False)
                        succeeded = True
                        break
                    except Exception as exc:
                        print(f"[MAIN] Lần thử {attempt}/{MAX_RETRIES} lỗi với {source_info['url']}: {exc}")
                        if attempt < max(1, MAX_RETRIES) and site_name in {"itviec", "topcv"}:
                            try:
                                page.close()
                            except Exception:
                                pass
                            try:
                                context.close()
                            except Exception:
                                pass
                            if PROXY_MODE == MODE.PROXY:
                                proxy = get_working_proxy_forever(
                                    ITVIEC_URL if site_name == "itviec" else TOPCV_URL
                                )
                            context = create_browser_context(p, proxy)
                            page = context.pages[0] if context.pages else context.new_page()
                if not succeeded:
                    set_source_status(source["src_id"], SOURCE_STATUS_ERROR)
        finally:
            context.close()

if __name__ == "__main__":
    main()
