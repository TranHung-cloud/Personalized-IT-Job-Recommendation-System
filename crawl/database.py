from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
import pandas as pd
import json
from datetime import date, datetime
import boto3
from botocore.exceptions import BotoCoreError, ClientError

from crawl.config import (
    DATABASE_URL,
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_REGION,
    AWS_ENDPOINT_URL_S3,
    STORAGE_BUCKET,
)

pool = ConnectionPool(
    conninfo=DATABASE_URL,
    min_size=1,
    max_size=5,
    timeout=30,
    max_lifetime=1800,
    max_idle=300,
    kwargs={
        "row_factory": dict_row,
        "connect_timeout": 10,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    },
    check=ConnectionPool.check_connection,
)

_s3_client = None


def save_raw_jd_to_bucket(src_id, crawled_date, jd_data):
    global _s3_client
    if not STORAGE_BUCKET:
        raise RuntimeError("Thiếu cấu hình STORAGE_BUCKET trong crawl/.env")

    if _s3_client is None:
        client_options = {"region_name": AWS_REGION} if AWS_REGION else {}
        if AWS_ENDPOINT_URL_S3:
            client_options["endpoint_url"] = AWS_ENDPOINT_URL_S3
        if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
            client_options.update({
                "aws_access_key_id": AWS_ACCESS_KEY_ID,
                "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
            })
        _s3_client = boto3.client("s3", **client_options)

    object_key = f"raw-job-descriptions/{src_id}_{crawled_date}.json"
    try:
        _s3_client.put_object(
            Bucket=STORAGE_BUCKET,
            Key=object_key,
            Body=json.dumps(
                jd_data,
                ensure_ascii=False,
                indent=2,
                default=lambda value: value.isoformat()
                if isinstance(value, (date, datetime))
                else str(value),
            ).encode("utf-8"),
            ContentType="application/json; charset=utf-8",
        )
    except (BotoCoreError, ClientError) as exc:
        raise RuntimeError(f"Không thể lưu JD vào S3 ({object_key}): {exc}") from exc
    return object_key

def execute_query(query, params=None, fetch=False, conn=None):
    if conn is not None:
        with conn.cursor() as cur:
            cur.execute(query, params)

            if fetch:
                if fetch == "one":
                    return cur.fetchone()
                return cur.fetchall()

            return cur.rowcount
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)

            if fetch:
                if fetch == "one":
                    return cur.fetchone()
                return cur.fetchall()

            return cur.rowcount

def read_dataframe(query, params=None):
    rows = execute_query(query, params=params, fetch=True)
    return pd.DataFrame(rows)

def close_connection():
    pool.close()
