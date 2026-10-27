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

MODE = Literal["pos", "wm", "loc", "sk"]

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
    if existing["id"] is not None:
        return {
            "id": existing["id"],
            "status": existing["status"],
            "method": "exact",
        }
    return None

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
        return None

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
            "status": "pending",
            "method": "fuzzy",
        }

    if score_margin < MIN_SCORE_MARGIN:
        return {
            "id": candidates[best_name]["id"],
            "status": "review",
            "method": "fuzzy",
        }

    return {
        "id": candidates[best_name]["id"],
        "status": "mapped",
        "method": "fuzzy",
    }

def match_raw_name(lookup: dict, raw_name: str):
    exact_result = exact_match(raw_name, lookup)
    if exact_result:
        return exact_result
    fuzzy_result = fuzzy_match(raw_name, lookup)
    if fuzzy_result:
        return fuzzy_result
    return None