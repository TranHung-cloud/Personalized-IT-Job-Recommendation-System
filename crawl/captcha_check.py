import time
import random

CF_IFRAME = 'iframe[src*="challenges.cloudflare.com"]'
def is_challenge(page):
    try:
        title = page.title().lower()
    except Exception:
        return True  # đang điều hướng giữa chừng
    if any(k in title for k in ("just a moment", "attention required", "một chút")):
        return True
    return page.locator(CF_IFRAME).count() > 0


def click_checkbox(page):
    """Click checkbox theo toạ độ. Iframe nằm trong shadow root đóng nên
    lấy vị trí từ input hidden cf-turnstile-response (nằm ngoài, ở light DOM)."""
    inp = page.locator('input[name="cf-turnstile-response"]').first
    if inp.count() == 0:
        return False

    # div chứa widget là anh em liền trước của input; không có thì dùng cha
    box = None
    for xp in ("xpath=preceding-sibling::div[1]", "xpath=.."):
        try:
            box = inp.locator(xp).bounding_box()
        except Exception:
            box = None
        if box and box["width"] > 50 and box["height"] > 30:
            break
    if not box:
        return False

    # checkbox nằm bên trái widget (~28px), căn giữa theo chiều dọc
    x = box["x"] + 28 + random.uniform(-3, 3)
    y = box["y"] + box["height"] / 2 + random.uniform(-3, 3)
    page.mouse.move(x - random.randint(80, 200), y + random.randint(-60, 60), steps=15)
    page.mouse.move(x, y, steps=12)
    time.sleep(random.uniform(0.2, 0.5))
    page.mouse.click(x, y)
    return True


def clear_challenge(page, timeout=60):
    """True nếu đã qua challenge."""
    end = time.time() + timeout
    start = time.time()
    last_click = 0
    while time.time() < end:
        if not is_challenge(page):
            return True
        # Chờ ~6s cho nó tự qua; sau đó mới click, mỗi 12s một lần
        if time.time() - start > 6 and time.time() - last_click > 12:
            if click_checkbox(page):
                print("[CF] Đã click checkbox")
            last_click = time.time()
        time.sleep(1.5)
    return not is_challenge(page)