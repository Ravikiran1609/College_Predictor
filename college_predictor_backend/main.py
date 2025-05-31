from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
from pathlib import Path

app = FastAPI(title="College Cutoff Predictor")

# ──────────────────────────────────────────────────────────────────────────────
# 1) On startup, read the CSV into a DataFrame (only once).
#    We assume the file is exactly at `cet_cutoffs/cet_cutoffs_r1_prov.csv`
#    relative to this script's folder.
# ──────────────────────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
CSV_PATH = BASE_DIR / "cet_cutoffs" / "cet_cutoffs_r1_prov.csv"

if not CSV_PATH.exists():
    raise FileNotFoundError(f"Cannot find cutoff CSV at {CSV_PATH!r}")

# Load the entire CSV into a pandas DataFrame
# We expect the CSV to have at least these columns:
#   college_code, college_name, branch_code, category, cutoff_rank
# (all lowercase columns, exactly this spelling).
df = pd.read_csv(CSV_PATH, dtype={
    "college_code": str,
    "college_name": str,
    "branch_code": str,
    "category": str,
    "cutoff_rank": int,
})
# Ensure column names are exactly as expected (lowercase)
df.columns = [col.strip() for col in df.columns]

# Precompute sorted, unique categories and branches for the dropdowns
ALL_CATEGORIES = sorted(df["category"].dropna().unique().tolist())
ALL_BRANCHES = sorted(df["branch_code"].dropna().unique().tolist())

# ──────────────────────────────────────────────────────────────────────────────
# 2) Pydantic model for a single college entry returned by /predict
# ──────────────────────────────────────────────────────────────────────────────
class CollegeOut(BaseModel):
    college_code: str
    college_name: str
    branch_code: str
    category: str
    cutoff_rank: int

# ──────────────────────────────────────────────────────────────────────────────
# 3) Endpoint: GET /categories
#    Returns JSON list of category strings.
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/categories", response_model=List[str])
def get_categories():
    return ALL_CATEGORIES

# ──────────────────────────────────────────────────────────────────────────────
# 4) Endpoint: GET /branches
#    Returns JSON list of branch strings.
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/branches", response_model=List[str])
def get_branches():
    return ALL_BRANCHES

# ──────────────────────────────────────────────────────────────────────────────
# 5) Endpoint: GET /predict
#
#    Query parameters:
#      - rank: int        (the student's CET rank)
#      - category: str    (e.g. "GM", "1G", etc.; must be one of ALL_CATEGORIES)
#      - branch: Optional[str] (optional; if provided, must be one of ALL_BRANCHES)
#
#    Returns a JSON array of all colleges (as CollegeOut) whose cutoff_rank <= rank,
#    filtered by that category, and if branch is provided, also by that branch. 
#    The output is sorted ascending by cutoff_rank.
# ──────────────────────────────────────────────────────────────────────────────
@app.get("/predict", response_model=List[CollegeOut])
def predict(
    rank: int = Query(..., ge=1, description="Your CET rank (integer, ≥1)"),
    category: str = Query(..., description="Category code (e.g. GM, 1G, 2AK, etc.)"),
    branch: Optional[str] = Query(None, description="(Optional) Branch code (e.g. AI, EE, CE, etc.)")
):
    # 1) Validate category exists
    if category not in ALL_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Category must be one of {ALL_CATEGORIES!r}"
        )

    # 2) If branch is provided, validate it exists
    if branch is not None and branch not in ALL_BRANCHES:
        raise HTTPException(
            status_code=400,
            detail=f"Branch must be one of {ALL_BRANCHES!r} (or omitted)."
        )

    # 3) Filter DataFrame by category, then by cutoff_rank ≤ rank
    sub = df[df["category"] == category].copy()
    sub = sub[sub["cutoff_rank"] <= rank]

    # 4) If branch is provided, filter by that branch_code
    if branch is not None:
        sub = sub[sub["branch_code"] == branch]

    # 5) Sort ascending by cutoff_rank
    sub = sub.sort_values("cutoff_rank", ascending=True)

    # 6) Convert to list of Pydantic models (dictionaries)
    results = []
    for _, row in sub.iterrows():
        results.append(
            CollegeOut(
                college_code=row["college_code"],
                college_name=row["college_name"],
                branch_code=row["branch_code"],
                category=row["category"],
                cutoff_rank=int(row["cutoff_rank"])
            )
        )
    return results

