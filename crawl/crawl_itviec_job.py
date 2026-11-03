from playwright.sync_api import sync_playwright
import time
import json
import re
import pandas as pd
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
    ITVIEC_URL,
    MAX_PAGE_CRAWL_URL,
    MAX_URL_CRAWL,
    PROXY_MODE,
    MODE
)
from crawl.database import (
    execute_query,
    close_connection,
    pool
)
from crawl.jd_parser import (
    normalize_string,
    parse_experience,
    parse_education,
    convert_to_vnd,
    format_date,
    normalize_company
)
from crawl.matcher import (
    build_raw_lookup,
    match_raw_name,
)


def split_description(description):
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

def save_job_to_db(job_data):
    job_data["pos_id"] = job_data["job_pos"]["id"] if job_data.get("job_pos") and pd.notna(job_data["job_pos"]["id"]) else None
    job_data["wm_id"] = job_data["job_wm"]["id"] if job_data.get("job_wm") and pd.notna(job_data["job_wm"]["id"]) else None
    query = """
        INSERT INTO job (
            co_id, src_id, job_title, job_title_norm,
            job_exp_max, job_exp_min,
            job_sal_min, job_sal_max, job_sal_nego,
            job_desc, job_benefit,
            job_expired_at, job_posted_at,
            pos_id, wm_id, job_req
        ) VALUES (
            %(co_id)s, %(src_id)s, %(job_title)s, %(job_title_norm)s,
            %(job_exp_max)s, %(job_exp_min)s,
            %(job_sal_min)s, %(job_sal_max)s, %(job_sal_nego)s,
            %(job_desc)s, %(job_benefit)s,
            %(job_expired_at)s, %(job_posted_at)s,
            %(pos_id)s, %(wm_id)s, %(job_req)s
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
            (job_data["job_pos"]["name"], job_data["job_wm"]["name"], job_data["src_id"]),
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
            if skill["id"]:
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
            if loc["id"]:
                execute_query(
                    """
                    INSERT INTO job_location (job_id, loc_id)
                    VALUES (%s, %s)
                    """,
                    (job_id, loc["id"]),
                    conn=conn
                )

    return job_id

def main():
    site = execute_query("SELECT site_id FROM site WHERE site_name = %s", ("ITviec",), fetch="one")
    if not site:
        print("[MAIN] Không tìm thấy site ITviec trong cơ sở dữ liệu.")
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
                    proxy = get_working_proxy_forever(ITVIEC_URL)
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
                locator = page.locator('script[type="application/ld+json"]')
                script_content = locator.all_text_contents()
                for script in script_content:
                    try:
                        data = json.loads(script)
                        if data.get("@type") != "JobPosting":
                            continue
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
                        skills = []
                        if skills_raw:
                            skills = [match_raw_name(lookup_sk, sk, "sk") for sk in skills_raw]
                        # work mode
                        work_mode_raw = data.get("employmentType")
                        work_mode = match_raw_name(lookup_wm, work_mode_raw, "wm") if work_mode_raw else None
                        # location
                        locations_raw = data.get("jobLocation")
                        locations = []
                        for loc in locations_raw:
                            loc_name = loc.get("address").get("addressRegion")
                            if loc_name:
                                loc_match = match_raw_name(lookup_loc, loc_name, "loc")
                                if loc_match:
                                    locations.append(loc_match)
                        # company
                        company_raw = data.get("hiringOrganization", {}).get("name")
                        company = match_raw_name(lookup_com, normalize_company(company_raw), "com") if company_raw else None
                        # salary
                        salary_currency = None
                        salary_min = None
                        salary_max = None
                        salary_currency = data.get("baseSalary", {}).get("currency")
                        sal_min_raw = data.get("baseSalary", {}).get("value", {}).get("minValue")
                        sal_max_raw = data.get("baseSalary", {}).get("value", {}).get("maxValue")
                        if sal_min_raw and sal_max_raw:
                            salary_min = convert_to_vnd(sal_min_raw, salary_currency)
                            salary_max = convert_to_vnd(sal_max_raw, salary_currency)
                        overview = data.get("description")

                        # description
                        description = split_description(overview).get("Job description")
                        # requirement
                        requirement = split_description(overview).get("Your skills and experience")
                        # benefits
                        benefits = split_description(overview).get("Why you'll love working here")


                    except json.JSONDecodeError:
                        continue
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
                        position = match_raw_name(lookup_pos, pos_raw, "pos")

                # experience
                exp_range = parse_experience(requirement)
                # education
                req_edu = parse_education(requirement)
                # print("================== url =================")
                # print(url)
                # print("================== company =================")
                # print(company)
                # print("================== title =================")
                # print(title)
                # print("================== experience =================")
                # print(exp_range)
                # print("================== salary =================")
                # print(salary_min, salary_max)
                # print("================== description =================")
                # print(description)
                # print("================== requirement =================")
                # print(requirement)
                # print("================== benefits =================")
                # print(benefits)
                # print("================== posted at =================")
                # print(posted_at)
                # print("================== expired at =================")
                # print(expired_at)
                # print("================== position =================")
                # print(position)
                # print("================== work mode =================")
                # print(work_mode)
                # print("================== locations =================")
                # print(locations)
                # print("================== skills =================")
                # print(skills)
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
                    "job_req": requirement,
                    "job_skills": skills if skills else None,
                    "job_locations": locations if locations else None,
                })
            except Exception as e:
                begin = True
                print(f"[MAIN] Lỗi khi crawl URL {url}: {e}")
                continue

if __name__ == "__main__":
    main()