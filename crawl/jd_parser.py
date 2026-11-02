import re
import unicodedata
from bs4 import BeautifulSoup
import requests
from dateutil import parser
from datetime import datetime

COMPANY_PREFIXES = [
    "cong ty co phan",
    "cong ty tnhh mot thanh vien",
    "cong ty tnhh mtv",
    "cong ty tnhh",
    "cong ty cp",
    "cong ty",
    "tap doan",
]

COMPANY_SUFFIXES = [
    "company limited",
    "limited liability company",
    "joint stock company",
    "joint stock",
    "co ltd",
    "co limited",
    "company ltd",
    "corporation",
    "incorporated",
    "limited",
    "ltd",
    "inc",
    "jsc",
    "llc",
]

EDUCATION_PATTERNS = {
    "doctorate": [
        # Tiếng Việt
        r"\btien si\b",
        r"\btien sy\b",
        r"\btrinh do tien si\b",
        r"\bhoc vi tien si\b",
        r"\bbang tien si\b",
        r"\bnghien cuu sinh\b",

        # Tiếng Anh
        r"\bphd\b",
        r"\bph d\b",
        r"\bdoctorate\b",
        r"\bdoctoral degree\b",
        r"\bdoctor of philosophy\b",
        r"\bdoctor of science\b",
        r"\bdoctor of education\b",
        r"\bdoctoral qualification\b",
    ],

    "master": [
        # Tiếng Việt
        r"\bthac si\b",
        r"\bthac sy\b",
        r"\bbang thac si\b",
        r"\bbang thac sy\b",
        r"\btrinh do thac si\b",
        r"\bhoc vi thac si\b",
        r"\btot nghiep thac si\b",

        # Tiếng Anh
        r"\bmasters degree\b",
        r"\bmaster degree\b",
        r"\bmaster of science\b",
        r"\bmaster of arts\b",
        r"\bmaster of engineering\b",
        r"\bmaster of business administration\b",
        r"\bmaster of education\b",
        r"\bmaster of philosophy\b",
        r"\bmba\b",
        r"\bmsc\b",
        r"\bms degree\b",
        r"\bma degree\b",
        r"\bmeng\b",
    ],

    "engineer": [
        # Tiếng Việt
        r"\bky su\b",
        r"\bbang ky su\b",
        r"\bky su cong nghe\b",
        r"\bky su xay dung\b",
        r"\bky su phan mem\b",
        r"\bky su dien\b",
        r"\bky su co khi\b",
        r"\bcu nhan\b",
        r"\bbang cu nhan\b",
        r"\btrinh do cu nhan\b",
        r"\btot nghiep dai hoc\b",
        r"\btrinh do dai hoc\b",
        r"\bbang dai hoc\b",
        r"\bdai hoc tro len\b",

        # Tiếng Anh
        r"\bbachelor degree\b",
        r"\bbachelors degree\b",
        r"\bbachelor of engineering\b",
        r"\bbachelor of science in engineering\b",
        r"\bbachelor of arts\b",
        r"\bbachelor of science\b",
        r"\bbachelor of computer science\b",
        r"\bbachelor of information technology\b",
        r"\bundergraduate degree\b",
        r"\bengineering degree\b",
        r"\bengineer degree\b",
        r"\bcollege graduate\b",
    ],

    "college": [
        # Tiếng Việt
        r"\bcao dang\b",
        r"\bbang cao dang\b",
        r"\btot nghiep cao dang\b",
        r"\btrinh do cao dang\b",
        r"\bhe cao dang\b",

        # Tiếng Anh
        r"\bassociate degree\b",
        r"\bassociates degree\b",
        r"\bassociate of arts\b",
        r"\bassociate of science\b",
        r"\bassociate of applied science\b",
        r"\bcollege diploma\b",
        r"\bcollege qualification\b",
        r"\bhigher national diploma\b",
        r"\bhnd\b",
    ],

    "intermediate": [
        # Tiếng Việt
        r"\btrung cap\b",
        r"\bbang trung cap\b",
        r"\btot nghiep trung cap\b",
        r"\btrinh do trung cap\b",
        r"\btrung cap nghe\b",
        r"\btrung cap chuyen nghiep\b",

        # Tiếng Anh
        r"\bintermediate vocational\b",
        r"\bintermediate qualification\b",
        r"\bvocational qualification\b",
        r"\bvocational certificate\b",
        r"\btechnical certificate\b",
    ],
}

EDUCATION_PRIORITY = {
    "intermediate": 1,
    "college": 2,
    "bachelor": 3,
    "engineer": 4,
    "master": 5,
    "doctorate": 6,
}

EXPERIENCE_PATTERNS = {
    # 1. Khoảng kinh nghiệm: 2-3 years, 6-12 months
    "range": [
        re.compile(
            r"""
            (?P<min>\d+(?:\.\d+)?)
            \s*
            (?:-|to|through|den|toi)
            \s*
            (?P<max>\d+(?:\.\d+)?)
            \s*\+?\s*
            (?P<unit>
                years?|yrs?|yr
                |nam
                |months?|mos?|mo
                |thang
            )
            """,
            re.IGNORECASE | re.VERBOSE,
        ),
    ],

    # 2. Ít nhất N năm/tháng:
    # 2+ years, at least 2 years, minimum of 6 months
    "minimum": [
        re.compile(
            r"""
            (?:
                (?P<plus>\d+(?:\.\d+)?)\s*\+
                |
                (?:
                    at\s+least
                    | minimum(?:\s+of)?
                    | toi\s+thieu
                    | it\s+nhat
                    | tu
                    | co\s+tu
                    | co\s+it\s+nhat
                    | toi
                )
                \s+
                (?P<minimum>\d+(?:\.\d+)?)
            )
            \s*
            (?P<unit>
                years?|yrs?|yr
                |nam
                |months?|mos?|mo
                |thang
            )
            """,
            re.IGNORECASE | re.VERBOSE,
        ),
    ],

    # 3. Trên N năm/tháng:
    # more than 2 years, over 6 months
    "greater": [
        re.compile(
            r"""
            (?:
                more\s+than
                | over
                | above
                | tren
                | hon
            )
            \s+
            (?P<years>\d+(?:\.\d+)?)
            \s*
            (?P<unit>
                years?|yrs?|yr
                |nam
                |months?|mos?|mo
                |thang
            )
            """,
            re.IGNORECASE | re.VERBOSE,
        ),
    ],
}


def normalize_string(value: str | None) -> str | None:
    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return ""

    # 1. Remove HTML tags and extract text.
    if re.search(r"<\s*/?\s*[a-zA-Z][^>]*>", value):
        soup = BeautifulSoup(value, "html.parser")

        # Thêm dấu phân cách giữa các phần tử để tránh dính chữ.
        for tag in soup.find_all(["br", "li", "p", "div", "tr"]):
            tag.insert_before(" ")
            tag.insert_after(" ")

        value = soup.get_text(separator=" ", strip=True)

    # 2. Normalize Unicode
    value = unicodedata.normalize("NFKC", value)

    # 3. Decode HTML entities
    # BeautifulSoup đã xử lý entities khi parse HTML.
    # Bước này bổ sung cho các chuỗi entities còn sót lại.
    import html
    value = html.unescape(value)

    # 4. Lowercase
    value = value.casefold()

    # 5. Remove Vietnamese accents
    value = unicodedata.normalize("NFD", value)

    value = "".join(
        char
        for char in value
        if unicodedata.category(char) != "Mn"
    )

    # Handle Vietnamese đ
    value = value.replace("đ", "d")

    # 6. Normalize common separators
    value = re.sub(r"[\u2010-\u2015\u2212]", "-", value)

    # 7. Replace punctuation/special characters with spaces,
    # while preserving letters, numbers and meaningful symbols.
    value = re.sub(r"[^\w\s+#./-]", " ", value)

    # 8. Normalize whitespace
    value = re.sub(r"\s+", " ", value).strip()

    return value

def normalize_company(value: str | None) -> str | None:
    if value is None:
        return None

    # Reuse existing string normalization
    value = normalize_string(value)

    if not value:
        return ""

    # Remove legal prefixes
    for prefix in sorted(COMPANY_PREFIXES, key=len, reverse=True):
        value = re.sub(
            rf"^{re.escape(prefix)}(?=\s|$)",
            "",
            value,
        ).strip()

    # Remove legal suffixes
    for suffix in sorted(COMPANY_SUFFIXES, key=len, reverse=True):
        value = re.sub(
            rf"(?<=\s){re.escape(suffix)}$|^{re.escape(suffix)}$",
            "",
            value,
        ).strip()

    # Normalize whitespace after removal
    value = re.sub(r"\s+", " ", value).strip()

    return value

def parse_experience(text: str | None) -> dict:
    result = {
        "min_months": None,
        "max_months": None,
    }

    text = normalize_string(text)

    if not text:
        return result

    text = re.sub(r"\s*[-–—]\s*", "-", text)

    candidates = []

    # Đơn vị thời gian
    unit_pattern = r"(?:years?|yrs?|nam|months?|mos?|thang)"

    def to_months(value: str, unit: str) -> int:
        value = float(value)
        unit = unit.lower()

        if unit in ("year", "years", "yr", "yrs", "nam"):
            return round(value * 12)

        return round(value)

    # 1. Khoảng kinh nghiệm: 2-3 years, 6-12 months
    for pattern in EXPERIENCE_PATTERNS["range"]:
        for match in pattern.finditer(text):
            unit = match.group("unit")

            min_months = to_months(match.group("min"), unit)
            max_months = to_months(match.group("max"), unit)

            if min_months <= max_months:
                candidates.append({
                    "min_months": min_months,
                    "max_months": max_months,
                })

    # 2. Ít nhất N năm/tháng: 2+ years, at least 6 months
    for pattern in EXPERIENCE_PATTERNS["minimum"]:
        for match in pattern.finditer(text):
            value = match.group("plus") or match.group("minimum")
            unit = match.group("unit")

            candidates.append({
                "min_months": to_months(value, unit),
                "max_months": None,
            })

    # 3. Trên N năm/tháng
    for pattern in EXPERIENCE_PATTERNS["greater"]:
        for match in pattern.finditer(text):
            candidates.append({
                "min_months": to_months(
                    match.group("years"),
                    match.group("unit"),
                ),
                "max_months": None,
            })

    if not candidates:
        return result

    return max(
        candidates,
        key=lambda item: item["min_months"],
    )


def parse_education(text: str | None) -> dict:
    result = {
        "education": None,
    }

    text = normalize_string(text)

    if not text:
        return result

    candidates = []

    for education, patterns in EDUCATION_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                candidates.append(education)
                break

    if not candidates:
        return result

    # Lấy học vị có độ ưu tiên cao nhất.
    result["education"] = min(
        candidates,
        key=lambda item: EDUCATION_PRIORITY[item],
    )

    return result

def convert_to_vnd(amount, currency):
    if amount is None or not currency:
        return None

    currency = currency.upper()

    if currency == "VND":
        return amount

    url = "https://api.frankfurter.dev/v1/latest"
    params = {
        "base": currency,
        "symbols": "VND"
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        rate = data["rates"]["VND"]

        return round(float(amount) * rate, 2)

    except (requests.RequestException, KeyError, ValueError):
        return None

def format_date(date_str: str | None):
    if not date_str:
        return None

    formats = [
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%S.%f",
        "%d/%m/%Y",
        "%m/%d/%Y",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(
                date_str[:26] if "T" in date_str else date_str,
                fmt
            ).date()
        except ValueError:
            continue

    return None


def main():
    text = """
Must have

    Tốt nghiệp Đại học trở lên các chuyên ngành Kinh tế, Quản trị hoặc chuyên ngành liên quan.
    Có từ 2 năm kinh nghiệm làm Business Analyst (BA nghiệp vụ)
    Có kinh nghiệm thực hiện các công việc như khảo sát khách hàng, phân tích yêu cầu, viết tài liệu và phối hợp với đội phát triển, kiểm thử.

Nice to have

    Có hiểu biết hoặc kinh nghiệm liên quan đến một trong các nghiệp vụ như: Tài chính/ Nhân sự/ CRM/ Sản xuất/ Điều hành/ Văn phòng số,...
    Giao tiếp tốt, tư duy logic, cẩn thận tỉ mỉ
    Có khả năng ứng dụng các công cụ AI trong công việc
"""
    print(f"Original Text: {normalize_string(text)}")
    experience_info = parse_experience(text)
    degree_info = parse_education(text)
    print(f"Experience Info: {experience_info}")
    print(f"Degree Info: {degree_info}")

if __name__ == "__main__":
    main()