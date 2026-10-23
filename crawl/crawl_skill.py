from playwright.sync_api import sync_playwright
import time

from crawl.browser_interact import (
    create_browser_context,
)
from crawl.proxy_manager import (
    get_working_proxy_forever
)
from crawl.config import (
    ITVIEC_SKILL_URL
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
            sk_id = sk["sk_id"]
            execute_query(
                "INSERT INTO skill_raw (sk_raw_name, sk_raw_status, sk_id) VALUES (%s, 'mapped', %s) ON CONFLICT (sk_raw_name) DO NOTHING",
                (raw_skill, sk_id)
            )
        context.close()
        print(f"[MAIN] Đã xử lý {len(skills)} kỹ năng.")

if __name__ == "__main__":
    main()