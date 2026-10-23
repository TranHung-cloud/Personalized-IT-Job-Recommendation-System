from playwright.sync_api import sync_playwright
import time

from crawl.browser_interact import (
    create_browser_context,
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)
from crawl.config import (
    ITVIEC_POSITION_URL
)
from crawl.database import (
    execute_query,
    close_connection
)
from crawl.jd_parser import (
    normalize_string
)

def main():
    with sync_playwright() as p:
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
            pos = execute_query(
                "INSERT INTO position (pos_name) VALUES (%s) ON CONFLICT (pos_name) DO NOTHING RETURNING pos_id",
                (position,),
                fetch="one"
            )
            pos_id = pos["pos_id"]
            execute_query(
                "INSERT INTO position_raw (pos_raw_name, pos_raw_status, pos_id) VALUES (%s, 'mapped', %s) ON CONFLICT (pos_raw_name) DO NOTHING",
                (raw_position, pos_id)
            )
        context.close()
        print(f"[MAIN] Đã xử lý {len(positions)} vị trí.")

if __name__ == "__main__":
    main()