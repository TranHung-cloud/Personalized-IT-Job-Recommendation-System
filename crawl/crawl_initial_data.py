from playwright.sync_api import sync_playwright
import time

from crawl.browser_interact import (
    create_browser_context,
    wait_and_scroll
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)
from crawl.config import (
    ITVIEC_COMPANY_URL,
    ITVIEC_POSITION_URL,
    ITVIEC_SKILL_URL
)
from crawl.database import (
    execute_query,
    close_connection
)
from crawl.jd_parser import (
    normalize_company,
    normalize_string
)

def crawl_company():
    query_parameters = [
        "a-c",
        "d-f",
        "g-i",
        "j-l",
        "m-o",
        "p-r",
        "s-v",
        "w-z"
    ]
    com_saved = []
    with sync_playwright() as p:
        com_count = 0
        while True:
            try:
                proxy = get_working_proxy_forever(ITVIEC_COMPANY_URL)
                print(f"[MAIN] Đang sử dụng proxy: {proxy}")
                context = create_browser_context(p, proxy)
                page = (
                    context.pages[0]
                    if context.pages
                    else context.new_page()
                )
                for query in query_parameters:
                    url = f"{ITVIEC_COMPANY_URL}/{query}"
                    page.goto(
                        url,
                        wait_until="domcontentloaded",
                        timeout=60000
                    )
                    locator = page.locator("a.skill-tag__link")
                    companies = locator.all_inner_texts()
                    wait_and_scroll(page)
                    com_count += len(companies)
                    for company in companies:
                        company = company.strip()

                        if not company:
                            continue
                        co_name_norm = normalize_company(company)
                        if company not in com_saved:
                            execute_query(
                                "INSERT INTO company (co_name, co_name_norm) VALUES (%s, %s)",
                                (company, co_name_norm)
                            )
                            com_saved.append(company)
            except Exception as e:
                context.close()
                continue
            if query == query_parameters[-1]:
                break
        context.close()
        print(f"[MAIN] Đã xử lý {com_count} công ty.")

def crawl_position():
    pos_saved = []
    pos_count = 0
    with sync_playwright() as p:
        while True:
            try:
                proxy = get_working_proxy_forever(ITVIEC_POSITION_URL)
                print(f"[MAIN] Đang sử dụng proxy: {proxy}")

                context = create_browser_context(p, proxy)
                page = (
                    context.pages[0]
                    if context.pages
                    else context.new_page()
                )
                page.goto(
                    ITVIEC_POSITION_URL,
                    wait_until="domcontentloaded",
                    timeout=60000
                )
                locator = page.locator("a.skill-tag-link")
                positions = locator.all_inner_texts()
                for position in positions:
                    position = position.strip()

                    if not position:
                        continue
                    raw_position = normalize_string(position)
                    if position in pos_saved:
                        continue
                    pos = execute_query(
                        "INSERT INTO position (pos_name) VALUES (%s) ON CONFLICT (pos_name) DO NOTHING RETURNING pos_id",
                        (position,),
                        fetch="one"
                    )
                    if not pos:
                        continue
                    pos_saved.append(position)
                    pos_id = pos["pos_id"]
                    execute_query(
                        "INSERT INTO position_raw (pos_raw_name, pos_raw_status, pos_id) VALUES (%s, 'mapped', %s) ON CONFLICT (pos_raw_name) DO NOTHING",
                        (raw_position, pos_id)
                    )
                    pos_count += 1
                context.close()
                break
            except Exception as e:
                print(f"[MAIN] Lỗi: {e}")
                context.close()
                continue
        print(f"[MAIN] Đã xử lý {pos_count} vị trí.")

def crawl_skill():
    sk_saved = []
    sk_count = 0
    with sync_playwright() as p:
        while True:
            try:
                proxy = get_working_proxy_forever(ITVIEC_SKILL_URL)
                print(f"[MAIN] Đang sử dụng proxy: {proxy}")

                context = create_browser_context(p, proxy)
                page = (
                    context.pages[0]
                    if context.pages
                    else context.new_page()
                )
                page.goto(
                    ITVIEC_SKILL_URL,
                    wait_until="domcontentloaded",
                    timeout=60000
                )
                locator = page.locator("a.skill-tag__link")
                skills = locator.all_inner_texts()
                for skill in skills:
                    skill = skill.strip()

                    if not skill:
                        continue
                    raw_skill = normalize_string(skill)
                    sk = execute_query(
                        "INSERT INTO skill (sk_name) VALUES (%s) ON CONFLICT (sk_name) DO NOTHING RETURNING sk_id",
                        (skill,),
                        fetch="one"
                    )
                    if not sk:
                        continue
                    sk_id = sk["sk_id"]
                    execute_query(
                        "INSERT INTO skill_raw (sk_raw_name, sk_raw_status, sk_id) VALUES (%s, 'mapped', %s) ON CONFLICT (sk_raw_name) DO NOTHING",
                        (raw_skill, sk_id)
                    )
                    sk_count += 1
                context.close()
                break
            except Exception as e:
                print(f"[MAIN] Lỗi: {e}")
                context.close()
                continue

        print(f"[MAIN] Đã xử lý {sk_count} kỹ năng.")

def main():
    try:
        crawl_company()
        time.sleep(30)

        crawl_position()
        time.sleep(30)

        crawl_skill()
        print("[MAIN] Đã hoàn thành tất cả dữ liệu ban đầu.")
    finally:
        close_connection()

if __name__ == "__main__":
    main()