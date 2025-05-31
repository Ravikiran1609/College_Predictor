# main.py

from fastapi import FastAPI, HTTPException
from typing import List, Optional
import pandas as pd
import glob
import os

app = FastAPI(
    title="College Cutoff Predictor",
    description="Lookup college/branch cutoffs across multiple courses (ENGG, BSCNURS, PHARMA, agri, etc.)",
    version="1.0.0",
)

# ────────────────────────────────────────────────────────────────────────────────
# At startup: read every “*_normalized.csv” file from cet_cutoffs/ and concatenate
# into a single pandas DataFrame. Then coerce cutoff_rank → numeric and drop NaNs.
# ────────────────────────────────────────────────────────────────────────────────

DATA_DIR = "cet_cutoffs"

def load_all_normalized_csvs(data_dir: str) -> pd.DataFrame:
    """
    Finds every CSV ending in “_normalized.csv” under `data_dir`, reads it,
    and concatenates into a single DataFrame.
    """
    pattern = os.path.join(data_dir, "*_normalized.csv")
    file_list = glob.glob(pattern)
    if not file_list:
        # If no “_normalized.csv” exists, raise an error
        raise RuntimeError(f"No normalized CSVs found under {data_dir!r} (looking for '*_normalized.csv').")

    dfs = []
    for path in sorted(file_list):
        df = pd.read_csv(path, dtype=str, keep_default_na=False)
        dfs.append(df)

    merged = pd.concat(dfs, ignore_index=True)
    return merged

try:
    df_all = load_all_normalized_csvs(DATA_DIR)
except Exception as e:
    # If startup fails (e.g. missing folder or no CSVs), crash quickly.
    raise RuntimeError(f"Failed to load normalized CSVs: {e!s}")

# Coerce cutoff_rank to numeric. Any non‐numeric values become NaN → then drop them.
df_all["cutoff_rank"] = pd.to_numeric(df_all["cutoff_rank"], errors="coerce")
df_all = df_all.dropna(subset=["cutoff_rank"])
df_all["cutoff_rank"] = df_all["cutoff_rank"].astype(int)

# If your normalized CSVs do not include college_code/college_name, comment out these two lines:
# Otherwise, keep them. If they’re missing, Pandas will create those columns as NaN.
if "college_code" not in df_all.columns:
    # Create a dummy column so that code below never breaks
    df_all["college_code"] = ""
if "college_name" not in df_all.columns:
    df_all["college_name"] = ""

# Precompute sorted, unique lists for the dropdown endpoints:
all_courses    = sorted(df_all["course"].dropna().unique().tolist())
all_categories = sorted(df_all["category"].dropna().unique().tolist())
all_branches   = sorted(df_all["branch"].dropna().unique().tolist())

# ────────────────────────────────────────────────────────────────────────────────
#   GET /courses
#   Returns a JSON array of all available “course” strings (e.g. ["ENGG","BSCNURS","PHARMA","agri",…]).
# ────────────────────────────────────────────────────────────────────────────────
@app.get("/courses", response_model=List[str])
def get_courses():
    return all_courses


# ────────────────────────────────────────────────────────────────────────────────
#   GET /categories
#   Returns a JSON array of all available “category” strings (e.g. ["1G","1K","1R","2AG",…,"GM","SCG","…"]).
# ────────────────────────────────────────────────────────────────────────────────
@app.get("/categories", response_model=List[str])
def get_categories():
    return all_categories


# ────────────────────────────────────────────────────────────────────────────────
#   GET /branches
#   Returns a JSON array of all available “branch” strings 
#   (e.g. ["AI Artificial Intelligence","AR Architecture","CE Civil","CS Computers",…]).
# ────────────────────────────────────────────────────────────────────────────────
@app.get("/branches", response_model=List[str])
def get_branches():
    return all_branches


# ────────────────────────────────────────────────────────────────────────────────
#   GET /find
#   Query parameters:
#     • course   (e.g. “ENGG”)
#     • category (e.g. “GM”)
#     • rank     (an integer; we will return only rows whose cutoff_rank >= rank)
#     • branch   (optional; e.g. “EE Electrical”). If provided, filter to exactly that branch.
#
#   Returns: a JSON array of objects, each having:
#     {
#       "course":       "...",
#       "college_code": "...",   # (empty string if your CSV had none)
#       "college_name": "...",   # (empty string if your CSV had none)
#       "branch":       "...",
#       "category":     "...",
#       "cutoff_rank":   12345
#     }
#
#   The result set is sorted in ascending order of cutoff_rank.
# ────────────────────────────────────────────────────────────────────────────────
@app.get("/find")
def find_colleges(
    course: str,
    category: str,
    rank: int,
    branch: Optional[str] = None
):
    # Validate course/category
    if course not in all_courses:
        raise HTTPException(status_code=400, detail=f"Invalid course: {course!r}")
    if category not in all_categories:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category!r}")

    # Filter the DataFrame
    df_filtered = df_all[
        (df_all["course"] == course) &
        (df_all["category"] == category) &
        (df_all["cutoff_rank"] >= rank)
    ]

    if branch:
        if branch not in all_branches:
            raise HTTPException(status_code=400, detail=f"Invalid branch: {branch!r}")
        df_filtered = df_filtered[df_filtered["branch"] == branch]

    # Sort ascending by cutoff_rank
    df_filtered = df_filtered.sort_values("cutoff_rank", ascending=True)

    # Build the JSON array
    results = []
    for _, row in df_filtered.iterrows():
        results.append({
            "course":       row["course"],
            "college_code": row["college_code"],   # "" if not present
            "college_name": row["college_name"],   # "" if not present
            "branch":       row["branch"],
            "category":     row["category"],
            "cutoff_rank":   int(row["cutoff_rank"]),
        })

    return results

