import json
import re
from datetime import date
from urllib.parse import urljoin, urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup

from crawl.config import (
    MODE,
    PROXY_MODE,
    VIETNAMWORKS_URL,
)
from crawl.database import (
    close_connection,
    execute_query,
    pool,
    save_raw_jd_to_bucket,
)
from crawl.jd_parser import (
    convert_to_vnd,
    format_date,
    html_to_text,
    normalize_company,
    normalize_string,
    parse_education,
    parse_experience,
)
from crawl.matcher import (
    build_raw_lookup,
    dictionary_match,
    match_raw_names,
)
from crawl.proxy_manager import get_working_proxy_forever

TYPE_WORKING_MAP = {
    1: "Toàn thời gian",
    2: "Bán thời gian",
    3: "Thực tập",
    4: "Nghề tự do",
    5: "Hợp đồng thời vụ",
    6: "Khác",
    7: "Việc làm online",
}

MAX_NEXT_REDIRECTS = 5


class NextRedirectError(ValueError):
    def __init__(self, target_url):
        self.target_url = target_url
        super().__init__(f"VietnamWorks NEXT_REDIRECT tới {target_url}")


def extract_next_f(html):
    """Join the data chunks emitted by Next.js Flight on VietnamWorks pages."""
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
    """Resolve VietnamWorks' jobDetail and its referenced Flight payloads."""
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

def save_job_to_db(job_data, raw_jd_json):
    job_data["pos_id"] = job_data["job_pos"]["id"] if job_data.get("job_pos") and pd.notna(job_data["job_pos"]["id"]) else None
    job_data["wm_id"] = job_data["job_wm"]["id"] if job_data.get("job_wm") and pd.notna(job_data["job_wm"]["id"]) else None
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
        row = execute_query(
            query, job_data, fetch="one", conn=conn
        )
        job_id = row["job_id"]

        execute_query(
            """
            UPDATE source
            SET src_crawled_at = NOW(),
            pos_raw_name = %s,
            wm_raw_name = %s
            WHERE src_id = %s
            """,
            (
                (job_data.get("job_pos") or {}).get("name"),
                (job_data.get("job_wm") or {}).get("name"),
                job_data["src_id"],
            ),
            conn=conn
        )

        seen_skill_ids = set()
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
            if (
                skill.get("id") is not None
                and pd.notna(skill["id"])
                and skill["id"] not in seen_skill_ids
            ):
                execute_query(
                    """
                    INSERT INTO job_skill (job_id, sk_id)
                    VALUES (%s, %s)
                    """,
                    (job_id, skill["id"]),
                    conn=conn
                )
                seen_skill_ids.add(skill["id"])

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

    save_raw_jd_to_bucket(
        job_data["src_id"], date.today().isoformat(), raw_jd_json
    )
    return job_id

def main():
    site = execute_query(
        "SELECT site_id FROM site WHERE site_name = %s",
        ("VietnamWorks",),
        fetch="one",
    )
    if not site:
        print("[MAIN] Không tìm thấy site VietnamWorks trong cơ sở dữ liệu.")
        return

    urls = [
        {"url": row["src_url"], "src_id": row["src_id"]}
        for row in execute_query(
            "SELECT src_url, src_id FROM source WHERE site_id = %s AND src_crawled_at IS NULL",
            (site["site_id"],),
            fetch=True,
        )
    ]
    lookups = {
        mode: build_raw_lookup(mode)
        for mode in ("pos", "wm", "loc", "sk", "com")
    }
    proxy = None
    if PROXY_MODE == MODE.PROXY:
        proxy = get_working_proxy_forever(VIETNAMWORKS_URL)
        print(f"[MAIN] Đang sử dụng proxy: {proxy}")
    proxies = {"http": proxy, "https": proxy} if proxy else None

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/131.0.0.0 Safari/537.36"
        )
    }
    for url in urls:
        try:
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

            # Flight payload references can be concatenated to the end of the
            # requirement text; drop that serialized data if it leaked through.
            requirement = re.split(
                r"\n[a-zA-Z0-9]+:\s*\{\s*[\"']skillName[\"']\s*:",
                requirement,
                maxsplit=1,
            )[0]

            # VietnamWorks sometimes appends the company-offers section to the
            # requirement HTML. Benefits are stored separately from benefit tags.
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
                lookups["com"],
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
            positions = match_raw_names(lookups["pos"], position_names, "pos")
            position = positions[0] if positions else None

            location_names = [
                location.get("cityNameVI") or location.get("cityName")
                for location in data.get("workingLocations") or []
                if isinstance(location, dict)
                and (location.get("cityNameVI") or location.get("cityName"))
            ]
            locations = _unique_matches(
                match_raw_names(lookups["loc"], location_names, "loc")
            )

            skills_raw = [
                skill.get("skillName")
                for skill in data.get("skills") or []
                if isinstance(skill, dict) and skill.get("skillName")
            ]
            requirement_skills = dictionary_match(lookups["sk"], requirement, "sk")
            skills = _unique_matches(
                match_raw_names(lookups["sk"], skills_raw + requirement_skills, "sk")
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
                lookups["wm"], [work_mode_raw] if work_mode_raw else [], "wm"
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
            save_job_to_db(
                job_data,
                raw_jd_json
            )
            print(job_data)
        except Exception as exc:
            print(f"[MAIN] Lỗi khi crawl URL {url}: {exc}")
    close_connection()


if __name__ == "__main__":
    main()
