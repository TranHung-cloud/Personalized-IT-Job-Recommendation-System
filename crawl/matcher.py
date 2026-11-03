from crawl.database import read_dataframe
from typing import Literal
from rapidfuzz import fuzz, process

from crawl.config import (
    MIN_BEST_SCORE,
    MIN_SCORE_MARGIN,
    SHORT_NAME_LENGTH,
    SHORT_NAME_MIN_SCORE,
    TOP_N,
)
from crawl.jd_parser import normalize_string
from crawl.database import execute_query

MODE = Literal["pos", "wm", "loc", "sk", "com"]

def build_raw_lookup(mode: MODE):
    match mode:
        case "pos":
            query = """
                SELECT pos_raw_name, pos_id, pos_raw_status
                FROM position_raw
                WHERE pos_raw_status IN ('mapped', 'review', 'pending')
            """
        case "wm":
            query = """
                SELECT wm_raw_name, wm_id, wm_raw_status
                FROM work_mode_raw
                WHERE wm_raw_status IN ('mapped', 'review', 'pending')
            """
        case "loc":
            query = """
                SELECT loc_raw_name, loc_id, loc_raw_status
                FROM location_raw
                WHERE loc_raw_status IN ('mapped', 'review', 'pending')
            """
        case "sk":
            query = """
                SELECT sk_raw_name, sk_id, sk_raw_status
                FROM skill_raw
                WHERE sk_raw_status IN ('mapped', 'review', 'pending')
            """
        case "com":
            query = """
                SELECT co_name_norm, co_id, 'mapped' as co_status
                FROM company
            """
        case _:
            raise ValueError(f"Invalid mode: {mode}")

    df = read_dataframe(query)
    name_col, id_col, status_col = df.columns

    return {
        normalize_string(row[name_col]): {
            "id": row[id_col],
            "status": row[status_col],
        }
        for _, row in df.iterrows()
    }

def exact_match(raw_name: str, lookup: dict):
    normalized_name = normalize_string(raw_name)
    if not normalized_name:
        return None
    existing = lookup.get(normalized_name)
    if not existing:
        return None
    return {
        "id": existing["id"],
        "name": normalized_name,
        "status": existing["status"],
        "method": "exact",
    }

def fuzzy_match(raw_name: str, lookup: dict):
    normalized_name = normalize_string(raw_name)
    if not normalized_name:
        return None
    candidates = {
        name: data
        for name, data in lookup.items()
        if data["status"] == "mapped" 
        and data["id"] is not None
    }
    if not candidates:
        return None
    results = process.extract(
        normalized_name,
        candidates.keys(),
        scorer=fuzz.ratio,
        limit=TOP_N,
    )
    if not results:
        return {
            "id": None,
            "name": normalized_name,
            "status": "pending",
            "method": None,
        }

    best_name, best_score, _ = results[0]
    second_best_score = results[1][1] if len(results) > 1 else 0
    score_margin = best_score - second_best_score
    name_length = len(normalized_name)
    min_score = (
        SHORT_NAME_MIN_SCORE
        if name_length <= SHORT_NAME_LENGTH
        else MIN_BEST_SCORE
    )

    if best_score < min_score:
        return {
            "id": None,
            "name": normalized_name,
            "status": "pending",
            "method": "fuzzy",
        }

    if score_margin < MIN_SCORE_MARGIN:
        return {
            "id": candidates[best_name]["id"],
            "name": normalized_name,
            "status": "review",
            "method": "fuzzy",
        }

    return {
        "id": candidates[best_name]["id"],
        "name": normalized_name,
        "status": "mapped",
        "method": "fuzzy",
    }

def match_raw_names(lookup: dict, raw_names: list, mode: MODE):
    """Match each distinct normalized raw value once, preserving input order."""
    unique_values = []
    seen = set()
    for raw_value in raw_name or []:
        normalized_name = normalize_string(raw_value)
        if not normalized_name or normalized_name in seen:
            continue
        seen.add(normalized_name)
        unique_values.append((raw_value, normalized_name))

    results = []
    if mode == "com":
        for raw_value, normalized_name in unique_values:
            result = exact_match(raw_value, lookup)
            if result:
                results.append(result)
                continue

            fuzzy_result = fuzzy_match(raw_value, lookup)
            if fuzzy_result and fuzzy_result["status"] == "mapped":
                results.append(fuzzy_result)
                continue

            row = execute_query(
                """
                    INSERT INTO company (co_name, co_name_norm)
                    VALUES (%s, %s)
                    RETURNING co_id
                """,
                (raw_value, normalized_name),
                fetch="one",
            )
            results.append({
                "id": row["co_id"],
                "name": normalized_name,
                "status": "new",
                "method": None if fuzzy_result is None else fuzzy_result["method"],
            })
            lookup[normalized_name] = {"id": row["co_id"], "status": "new"}
        return results

    try:
        table, name_col, id_col, status_col, count_col = {
            "pos": ("position_raw", "pos_raw_name", "pos_id", "pos_raw_status", "pos_raw_count"),
            "wm": ("work_mode_raw", "wm_raw_name", "wm_id", "wm_raw_status", "wm_raw_count"),
            "loc": ("location_raw", "loc_raw_name", "loc_id", "loc_raw_status", "loc_raw_count"),
            "sk": ("skill_raw", "sk_raw_name", "sk_id", "sk_raw_status", "sk_raw_count"),
        }[mode]
    except KeyError as exc:
        raise ValueError(f"Invalid mode: {mode}") from exc

    count_query = {
        "pos": "UPDATE position_raw SET pos_raw_count = pos_raw_count + 1 WHERE pos_raw_name = %s",
        "wm": "UPDATE work_mode_raw SET wm_raw_count = wm_raw_count + 1 WHERE wm_raw_name = %s",
        "loc": "UPDATE location_raw SET loc_raw_count = loc_raw_count + 1 WHERE loc_raw_name = %s",
        "sk": "UPDATE skill_raw SET sk_raw_count = sk_raw_count + 1 WHERE sk_raw_name = %s",
    }[mode]

    for raw_value, normalized_name in unique_values:
        result = exact_match(raw_value, lookup)
        if result:
            execute_query(count_query, (result["name"],))
            results.append(result)
            continue

        fuzzy_result = fuzzy_match(raw_value, lookup)
        if fuzzy_result is None:
            fuzzy_result = {
                "id": None,
                "name": normalized_name,
                "status": "pending",
                "method": None,
            }

        row = execute_query(
            f"""
                INSERT INTO {table} ({name_col}, {id_col}, {status_col})
                VALUES (%s, %s, %s)
                ON CONFLICT ({name_col}) DO UPDATE
                SET {count_col} = {table}.{count_col} + 1
                RETURNING {name_col}, {id_col}, {status_col}
            """,
            (fuzzy_result["name"], fuzzy_result["id"], fuzzy_result["status"]),
            fetch="one",
        )
        cached_name = normalize_string(row[name_col])
        lookup[cached_name] = {"id": row[id_col], "status": row[status_col]}
        results.append({
            "id": row[id_col],
            "name": cached_name,
            "status": row[status_col],
            "method": fuzzy_result["method"],
        })
    return results
