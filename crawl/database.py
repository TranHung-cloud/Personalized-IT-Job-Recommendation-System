from psycopg_pool import ConnectionPool
from psycopg.rows import dict_row
import pandas as pd

from crawl.config import (
    DATABASE_URL
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

def execute_query(query, params=None, fetch=False):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)

            if fetch:
                if fetch == "one":
                    return cur.fetchone()
                return cur.fetchall()

            return cur.rowcount

def read_dataframe(query, params=None):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            rows = execute_query(query, params=params, fetch=True)
    return pd.DataFrame(rows)

def close_connection():
    pool.close()