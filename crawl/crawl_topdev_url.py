import re
import json
import time

from playwright.sync_api import sync_playwright

from crawl.browser_interact import (
    create_browser_context,
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)
from crawl.config import (
    TOPDEV_JOB_LIST_URL,
    MAX_PAGE_CRAWL_URL,
    MAX_URL_CRAWL
)
from crawl.database import (
    execute_query,
    close_connection
)

def main():
    SITE = execute_query("SELECT site_id FROM site WHERE site_name = %s", ("TopDev",), fetch="one")
    if not SITE:
        print("[MAIN] Không tìm thấy site TopDev trong cơ sở dữ liệu.")
        return
    site_id = SITE["site_id"]

    remain_urls = {
        row["src_url"] for row in execute_query("SELECT src_url FROM source WHERE site_id = %s", (site_id,), fetch=True)
    }
    CATS = "2,3,4,5,6,7,8,9,10,11,12,13,67"

    PUSH = re.compile(
        r'self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)'
    )
    with sync_playwright() as p:
        page_number = 1
        found_count = 0
        begin = True

        while page_number <= MAX_PAGE_CRAWL_URL and found_count <= MAX_URL_CRAWL:
            if begin:
                proxy = get_working_proxy_forever(TOPDEV_JOB_LIST_URL)
                print(f"[MAIN] Đang sử dụng proxy: {proxy}")

                context = create_browser_context(p, proxy)
                page = context.pages[0] if context.pages else context.new_page()
                begin = False

            try:
                url = f"{TOPDEV_JOB_LIST_URL}?job_categories_ids={CATS}&page={page_number}"
                page.goto(url, wait_until="domcontentloaded", timeout=60000)
                html = page.content()

                payload = "".join(json.loads(m) for m in PUSH.findall(html))
                dec = json.JSONDecoder()
                jobs = []

                for m in re.finditer(r'\{"jobs":\[', payload):
                    try:
                        obj, _ = dec.raw_decode(payload, m.start())
                    except json.JSONDecodeError:
                        continue

                    if "meta" in obj:
                        jobs, meta = obj["jobs"], obj["meta"]
                        break

                for j in jobs:
                    job_url = j.get("detail_url")

                    if not job_url or job_url in remain_urls:
                        continue

                    remain_urls.add(job_url)
                    execute_query(
                        "INSERT INTO source (site_id, src_url) VALUES (%s, %s)",
                        (site_id, job_url)
                    )
                    found_count += 1
                print(f"[MAIN] URL công việc đã thu thập đến trang {page_number}: {found_count}")
                if not meta or page_number >= meta.get("last_page", MAX_PAGE_CRAWL_URL):
                    break

                page_number += 1

            except Exception as e:
                print(f"[MAIN] Lỗi trang {page_number}: {e}")
                context.close()
                begin = True


if __name__ == "__main__":
    main()
