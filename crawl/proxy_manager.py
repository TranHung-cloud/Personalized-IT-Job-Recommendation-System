import csv
import random
import re
import urllib.request
import requests
import time

from crawl.config import (
    PROXY_TIMEOUT,
    MAX_PROXY_ATTEMPTS,
)


def get_vietnam_proxies():
    urls = [
        {
            "name": "ProxyScrape",
            "url": "https://api.proxyscrape.com/v4/free-proxy-list/get",
            "params": {
                "protocol": "http,https",
                "timeout": "3000",
                "country": "VN",
                "ssl": "all",
                "anonymity": "all",
                "limit": "20",
                "request": "displayproxies",
            },
            "limit": 20,
        },
        {
            "name": "Monosans",
            "url": "https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt",
            "params": {},
            "limit": 10,
        },
        {
            "name": "TheSpeedX",
            "url": "https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt",
            "params": {},
            "limit": 10,
        },
        {
            "name": "GeoNode",
            "url": "https://proxylist.geonode.com/api/proxy-list",
            "params": {
                "limit": 20,
                "page": 1,
                "sort_by": "lastChecked",
                "sort_type": "desc",
                "protocols": "http,https",
                "country": "VN",
            },
            "limit": 20,
        },
    ]

    proxies = []
    seen = set()

    for source in urls:
        try:
            print(f"[PROXY] Đang lấy từ {source['name']}...")

            response = requests.get(
                source["url"],
                params=source["params"],
                timeout=(3, 10)
            )
            response.raise_for_status()

            if source["name"] == "GeoNode":
                data = response.json()
                lines = [
                    f"{item['ip']}:{item['port']}"
                    for item in data.get("data", [])
                    if item.get("ip") and item.get("port")
                ]
            else:
                lines = response.text.splitlines()

            count = 0
            limit = source["limit"]

            for line in lines:
                line = line.strip()

                if not line or ":" not in line:
                    continue

                ip, port = line.rsplit(":", 1)

                try:
                    port = int(port)
                except ValueError:
                    continue

                if not ip or not 1 <= port <= 65535:
                    continue

                proxy = f"http://{ip}:{port}"

                if proxy in seen:
                    continue

                seen.add(proxy)
                proxies.append(proxy)
                count += 1

                if count >= limit:
                    break

            print(f"[PROXY] {source['name']}: {count} proxy")

        except (requests.RequestException, ValueError, KeyError) as e:
            print(f"[PROXY] {source['name']} lỗi: {e}")

    print(f"[PROXY] Tổng cộng: {len(proxies)} proxy")

    return proxies

def check_proxy(proxy, url_test):
    proxy_url = proxy
    try:
        proxy_handler = urllib.request.ProxyHandler({
            "http": proxy_url,
            "https": proxy_url,
        })
        opener = urllib.request.build_opener(proxy_handler)
        request = urllib.request.Request(
            url_test,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/131.0.0.0 Safari/537.36"
                )
            }
        )
        with opener.open(
            request,
            timeout=PROXY_TIMEOUT
        ) as response:
            if response.status < 300:
                return True
    except Exception as e:
        print(f"[PROXY] Proxy lỗi: {proxy} | {e}")
        return False
    return False

def select_working_proxy(proxies, url_test):
    if not proxies:
        return None
    attempts = min(
        len(proxies),
        MAX_PROXY_ATTEMPTS
    )
    for index, proxy in enumerate(
        proxies[:attempts],
        start=1
    ):
        print(
            f"[PROXY] Kiểm tra {index}/{attempts}: "
            f"{proxy}"
        )
        if check_proxy(proxy, url_test):
            print(
                f"[PROXY] Kết nối kiểm tra thành công: "
                f"{proxy}"
            )
            return proxy
        print("[PROXY] Không kết nối được, thử proxy tiếp theo.")
    return None

def get_working_proxy_forever(url):
    while True:
        print("[PROXY] Đang lấy danh sách proxy Việt Nam...")

        try:
            proxies = get_vietnam_proxies()

            if not proxies:
                print(
                    "[PROXY] Không có proxy khả dụng. "
                    "Thử lại sau 2 phút."
                )
                time.sleep(120)
                continue

            proxy = select_working_proxy(proxies, url)

            if not proxy:
                print(
                    "[PROXY] Không tìm được proxy hoạt động. "
                    "Thử lại sau 2 phút."
                )
                time.sleep(120)
                continue

            print(f"[PROXY] Đã chọn: {proxy}")
            return proxy

        except Exception as e:
            print(f"[PROXY] Lỗi lấy hoặc kiểm tra proxy: {e}")
            print("[PROXY] Thử lại sau 2 phút.")
            time.sleep(120)