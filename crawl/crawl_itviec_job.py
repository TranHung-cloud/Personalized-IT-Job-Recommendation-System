from playwright.sync_api import sync_playwright
import time
import json

from crawl.browser_interact import (
    create_browser_context,
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)

def main():
    urls = []
    max_page_number = 5 
    SITE = "ITVIEC"
    remain_urls = []
    with sync_playwright() as p:
        page_number = 1
        begin = True
        while(page_number <= max_page_number):
            if begin:
                proxy = get_working_proxy_forever(ITVIEC_JOB_LIST_URL)
                print(f"[MAIN] Đang sử dụng proxy: {proxy}")

                context = create_browser_context(p, proxy)
                page = (
                    context.pages[0]
                    if context.pages
                    else context.new_page()
                )
            try:
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
                        if data.get("@type") != "ItemList":
                            continue
                        items = data.get("itemListElement", [])
                        if not isinstance(items, list):
                            continue
                        for item in items:
                            if not isinstance(item, dict):
                                continue
                            if item.get("url") in remain_urls:
                                continue
                            remain_urls.append(item.get("url"))
                            job_url = item.get("url")
                            if job_url:
                                urls.append(job_url)
                    except json.JSONDecodeError:
                        continue
                print(f"[MAIN] URL công việc đã thu thập từ trang {page_number}: {urls}")
                if not urls:
                    print(f"[MAIN] Không tìm thấy URL công việc trên trang {page_number}.")
                    begin = True
                    continue
                if not page_next.is_visible():
                    print(f"[MAIN] Không còn trang tiếp theo.")
                    break
            except Exception as e:
                print(f"[MAIN] Lỗi khi thu thập từ trang {page_number}: {e}")
                begin = True
                continue
            page_number += 1

if __name__ == "__main__":
    main()