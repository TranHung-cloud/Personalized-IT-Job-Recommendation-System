import tempfile
import random

def wait_and_scroll(page, minimum=4, maximum=10):
    try:
        page.wait_for_timeout(
            random.randint(minimum * 1000, maximum * 1000)
        )

        for _ in range(random.randint(2, 4)):
            distance = random.randint(250, 600)

            page.evaluate(
                "(d) => window.scrollBy(0, d)",
                distance
            )

            page.wait_for_timeout(
                random.randint(minimum * 1000, maximum * 1000)
            )

        page.evaluate(
            "(d) => window.scrollBy(0, d)",
            random.randint(250, 600)
        )

        page.wait_for_timeout(
            random.randint(minimum * 1000, maximum * 1000)
        )

    except Exception as e:
        print(f"[WAIT & SCROLL] {e}")

def create_browser_context(playwright, proxy):
    profile_dir = tempfile.mkdtemp(prefix="chrome_profile_")
    return playwright.chromium.launch_persistent_context(
        user_data_dir=profile_dir,
        channel="chrome",
        headless=False, #github action True
        locale="vi-VN",
        timezone_id="Asia/Ho_Chi_Minh",
        viewport={
            "width": 1366,
            "height": 768,
        },
        proxy={"server": proxy},
        args=[
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ]
    )
