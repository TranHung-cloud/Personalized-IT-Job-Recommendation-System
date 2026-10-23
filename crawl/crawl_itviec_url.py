from playwright.sync_api import sync_playwright
import time
import json

from crawl.browser_interact import (
    create_browser_context,
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)
from crawl.config import (
    ITVIEC_JOB_LIST_URL,
    MAX_PAGE_CRAWL_URL,
    MAX_URL_CRAWL
)
from crawl.database import (
    execute_query,
    close_connection
)

def main():
    site = execute_query("SELECT site_id FROM site WHERE site_name = %s", ("ITviec",), fetch="one")
    if not site:
        print("[MAIN] Không tìm thấy site ITviec trong cơ sở dữ liệu.")
        return
    site_id = site["site_id"]
    remain_urls = {
        row["src_url"] for row in execute_query("SELECT src_url FROM source WHERE site_id = %s", (site_id,), fetch=True)
    }
    with sync_playwright() as p:
        page_number = 1
        begin = True
        found_count = 0
        while(page_number <= MAX_PAGE_CRAWL_URL and found_count <= MAX_URL_CRAWL):
            try:
                if begin:
                    proxy = get_working_proxy_forever(ITVIEC_JOB_LIST_URL)
                    print(f"[MAIN] Đang sử dụng proxy: {proxy}")

                    context = create_browser_context(p, proxy)
                    page = (
                        context.pages[0]
                        if context.pages
                        else context.new_page()
                    )
                    begin = False

                url = f"{ITVIEC_JOB_LIST_URL}?page={page_number}"
                page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=60000
                )
                locator = page.locator('script[type="application/ld+json"]')
                script_content = locator.all_text_contents()
                page_next = page.locator('div[class="page next"] a[rel="next"]')
                for script in script_content:
                    try:
                        data = json.loads(script)
                    except json.JSONDecodeError:
                        continue
                    
                    if data.get("@type") != "ItemList":
                        continue
                    items = data.get("itemListElement", [])
                    if not isinstance(items, list):
                        continue
                    for item in items:
                        if not isinstance(item, dict):
                            continue
                        job_url = item.get("url")
                        if job_url in remain_urls or not job_url:
                            continue
                        remain_urls.add(item.get("url"))
                        execute_query(
                            "INSERT INTO source (site_id, src_url) VALUES (%s, %s)",
                            (site_id, job_url),
                            fetch=False
                        )
                        found_count += 1
                print(f"[MAIN] Số lượng công việc đã thu thập từ trang {page_number}: {found_count}")
                if not page_next.is_visible():
                    print(f"[MAIN] Không còn trang tiếp theo.")
                    break
            except Exception as e:
                print(f"[MAIN] Lỗi khi thu thập từ trang {page_number}: {e}")
                begin = True
                context.close()
                continue
            page_number += 1
    close_connection()

if __name__ == "__main__":
    main()