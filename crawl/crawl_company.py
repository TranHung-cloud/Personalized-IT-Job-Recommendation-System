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
    ITVIEC_COMPANY_URL
)
from crawl.database import (
    execute_query,
    close_connection
)
from crawl.jd_parser import (
    normalize_company
)

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
def main():
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
        close_connection()

if __name__ == "__main__":
    main()