from playwright.sync_api import sync_playwright
import time
import json

from crawl.browser_interact import (
    create_browser_context,
    wait_and_scroll
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)
from crawl.config import (
    TOPCV_JOB_LIST_URL,
    ITVIEC_JOB_LIST_URL,
    TOPDEV_JOB_LIST_URL,
    MAX_PAGE_CRAWL_URL,
    MAX_URL_CRAWL
)
from crawl.database import (
    execute_query,
    close_connection
)

def crawl_topcv_url():
    site = execute_query("SELECT site_id FROM site WHERE site_name = %s", ("TopCV",), fetch="one")
    if not site:
        print("[MAIN] Không tìm thấy site TopCV trong cơ sở dữ liệu.")
        return
    site_id = site["site_id"]
    remain_urls = {
        row["src_url"] for row in execute_query("SELECT src_url FROM source WHERE site_id = %s", (site_id,), fetch=True)
    }
    CAT_FAMILIES = "r257"
    with sync_playwright() as p:
        page_number = 1
        begin = True
        found_count = 0
        while(page_number <= MAX_PAGE_CRAWL_URL and found_count <= MAX_URL_CRAWL):
            if begin:
                proxy = get_working_proxy_forever(TOPCV_JOB_LIST_URL)
                print(f"[MAIN] Đang sử dụng proxy: {proxy}")

                context = create_browser_context(p, proxy)
                page = (
                    context.pages[0]
                    if context.pages
                    else context.new_page()
                )
            try:
                begin = False
                url = f"{TOPCV_JOB_LIST_URL}?category_family={CAT_FAMILIES}&page={page_number}"
                page.goto(
                    url,
                    wait_until="domcontentloaded",
                    timeout=60000
                )
                time.sleep(86400)
                wait_and_scroll(page)
                locator = page.locator('script[type="application/ld+json"]')
                script_content = locator.all_text_contents()
                page_next = page.locator('ul[class="pagination"] a[rel="next"]')
                for script in script_content:
                    try:
                        data = json.loads(script)
                        for entry in data:
                            if not isinstance(entry, dict):
                                continue
                            entry_type = entry.get("@type", [])
                            if "SearchResultsPage" not in entry_type:
                                continue
                            main_entity = entry.get("mainEntity", {})
                            items = main_entity.get("itemListElement", [])
                            if not isinstance(items, list):
                                continue
                            for item in items:
                                if not isinstance(item, dict):
                                    continue
                                job_url = item.get("item", {}).get("url")
                                if job_url in remain_urls:
                                    continue
                                remain_urls.add(job_url)
                                execute_query(
                                    "INSERT INTO source (site_id, src_url) VALUES (%s, %s)",
                                    (site_id, job_url)
                                )
                                found_count += 1
                    except json.JSONDecodeError:
                        continue
                print(f"[MAIN] URL công việc đã thu thập từ trang {page_number}: {found_count}")
                if not page_next.is_visible():
                    print(f"[MAIN] Không còn trang tiếp theo.")
                    break
            except Exception as e:
                print(f"[MAIN] Lỗi khi thu thập từ trang {page_number}: {e}")
                context.close()
                begin = True
                continue
            page_number += 1
    close_connection()

def crawl_itviec_url():
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

def crawl_topdev_url():
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
    close_connection()

def main():
    crawl_topcv_url()
    time.sleep(120)

    crawl_itviec_url()
    time.sleep(120)

    crawl_topdev_url()

    print("[MAIN] Đã hoàn thành tất cả website.")

if __name__ == "__main__":
    main()