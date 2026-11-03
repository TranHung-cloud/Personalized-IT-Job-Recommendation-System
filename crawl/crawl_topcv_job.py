from playwright.sync_api import sync_playwright
import time
import json
import re
import pandas as pd
from datetime import date
from bs4 import BeautifulSoup

from crawl.browser_interact import (
    create_browser_context,
    wait_and_scroll
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)
from crawl.config import (
    TOPCV_JOB_LIST_URL,
    TOPCV_URL,
    MAX_PAGE_CRAWL_URL,
    MAX_URL_CRAWL,
    PROXY_MODE,
    MODE
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


def split_description(description):
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
    site = execute_query("SELECT site_id FROM site WHERE site_name = %s", ("TopCV",), fetch="one")
    if not site:
        print("[MAIN] Không tìm thấy site TopCV trong cơ sở dữ liệu.")
        return
    site_id = site["site_id"]
    urls_obj = execute_query("SELECT src_url, src_id FROM source WHERE site_id = %s AND src_crawled_at IS NULL", (site_id,), fetch=True)
    urls = [{
        "url": row["src_url"],
        "src_id": row["src_id"]
    } for row in urls_obj]
    lookup_pos = build_raw_lookup("pos")
    lookup_wm = build_raw_lookup("wm")
    lookup_loc = build_raw_lookup("loc")
    lookup_sk = build_raw_lookup("sk")
    lookup_com = build_raw_lookup("com")
    with sync_playwright() as p:
        begin = True
        for url in urls:
            if begin:
                proxy = None
                if PROXY_MODE == MODE.PROXY:
                    proxy = get_working_proxy_forever(TOPCV_URL)
                    print(f"[MAIN] Đang sử dụng proxy: {proxy}")

                context = create_browser_context(p, proxy)
                page = (
                    context.pages[0]
                    if context.pages
                    else context.new_page()
                )
            try:
                begin = False
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
                        locations = []
                        seen_locations = set()
                        for loc_match in location_matches:
                            location_id = loc_match.get("id")
                            location_key = (
                                ("id", location_id)
                                if location_id is not None and pd.notna(location_id)
                                else ("name", loc_match["name"])
                            )
                            if location_key not in seen_locations:
                                locations.append(loc_match)
                                seen_locations.add(location_key)
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
                        description_sections = split_description(overview)
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
                # Position is the non-domain tag under TopCV's "Chuyên môn" group.
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
                print("================== url =================")
                print(url)
                print("================== company =================")
                print(company)
                print("================== title =================")
                print(title)
                print("================== experience =================")
                print(exp_range)
                print("================== salary =================")
                print(salary_min, salary_max)
                print("================== description =================")
                print(description)
                print("================== requirement =================")
                print(requirement)
                print("================== benefits =================")
                print(benefits)
                print("================== posted at =================")
                print(posted_at)
                print("================== expired at =================")
                print(expired_at)
                print("================== position =================")
                print(position)
                print("================== work mode =================")
                print(work_mode)
                print("================== locations =================")
                print(locations)
                print("================== skills =================")
                print(skills)
                print("================== certificates =================")
                print(req_edu)
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
                }
                if skills_raw:
                    raw_jd_json["skills"] = skills_raw

                save_job_to_db({
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
                }, raw_jd_json)
            except Exception as e:
                begin = True
                print(f"[MAIN] Lỗi khi crawl URL {url}: {e}")
                continue

if __name__ == "__main__":
    main()
