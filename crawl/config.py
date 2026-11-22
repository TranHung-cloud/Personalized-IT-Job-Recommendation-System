import os
from pathlib import Path
from dotenv import load_dotenv
from enum import Enum

ROOT_DIR = Path(__file__).resolve().parent

load_dotenv(ROOT_DIR / ".env.public")

DATABASE_URL = os.getenv("DATABASE_URL")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
AWS_ENDPOINT_URL_S3 = os.getenv("AWS_ENDPOINT_URL_S3")
STORAGE_BUCKET = os.getenv("STORAGE_BUCKET")

PROXY_TIMEOUT = int(
    os.getenv("PROXY_TIMEOUT", "15")
)

MAX_PROXY_ATTEMPTS = int(
    os.getenv("MAX_PROXY_ATTEMPTS", "40")
)

MAX_PAGE_CRAWL_URL = int(
    os.getenv("MAX_PAGE_CRAWL_URL", "20")
)

MAX_URL_CRAWL = int(
    os.getenv("MAX_URL_CRAWL", "400")
)

MIN_BEST_SCORE = int(
    os.getenv("MIN_BEST_SCORE", "90")
)

MIN_SCORE_MARGIN = int(
    os.getenv("MIN_SCORE_MARGIN", "8")
)

SHORT_NAME_LENGTH = int(
    os.getenv("SHORT_NAME_LENGTH", "4")
)

SHORT_NAME_MIN_SCORE = int(
    os.getenv("SHORT_NAME_MIN_SCORE", "96")
)

TOP_N = int(
    os.getenv("TOP_N", "5")
)

ITVIEC_URL = os.getenv(
    "ITVIEC_URL", "https://itviec.com"
)

ITVIEC_SKILL_URL = os.getenv(
    "ITVIEC_SKILL_URL", "https://itviec.com/jobs-skill-index"
)

ITVIEC_POSITION_URL = os.getenv(
    "ITVIEC_POSITION_URL", "https://itviec.com/jobs-expertise-index"
)

ITVIEC_COMPANY_URL = os.getenv(
    "ITVIEC_COMPANY_URL", "https://itviec.com/jobs-company-index"
)

ITVIEC_JOB_LIST_URL = os.getenv(
    "ITVIEC_JOB_LIST_URL", "https://itviec.com/it-jobs"
)

TOPCV_URL = os.getenv(
    "TOPCV_URL", "https://topcv.vn"
)

TOPCV_JOB_LIST_URL = os.getenv(
    "TOPCV_JOB_LIST_URL", "https://topcv.vn/tim-viec-lam-cong-nghe-thong-tin-cr257"
)

VIETNAMWORKS_URL = os.getenv(
    "VIETNAMWORKS_URL", "https://www.vietnamworks.com/"
)

VIETNAMWORKS_JOB_LIST_URL = os.getenv(
    "VIETNAMWORKS_JOB_LIST_URL", "https://ms.vietnamworks.com/job-search/v1.0/search"
)

MAX_RETRIES = int(
    os.getenv("MAX_RETRIES", "3")
)

MAX_NEXT_REDIRECTS = int(
    os.getenv("MAX_NEXT_REDIRECTS", "5")
)

MAX_JOBS_PER_RUN = int(
    os.getenv("MAX_JOBS_PER_RUN", "100")
)

class MODE(Enum):
    DIRECT = 1
    PROXY = 2
PROXY_MODE = MODE.PROXY
