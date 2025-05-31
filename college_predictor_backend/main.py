# college_predictor_backend/main.py

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import pandas as pd
import os

app = FastAPI(title="CET College Predictor (CSV‐only backend)")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION: 
#   Ensure that cet_cutoffs_r1_prov.csv is present here (same folder as main.py)
# ─────────────────────────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), "cet_cutoffs_r1_prov.csv")
if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"Failed to find CSV at {CSV_PATH}")

# Load the CSV into a DataFrame at startup
df = pd.read_csv(
    CSV_PATH,
    dtype={
        "college_code": str,
        "college_name": str,
        "branch_code": str,
        "category": str,
        "cutoff_rank": int
    }
)

# Pre‐compute unique categories and branch codes
CATEGORIES = sorted(df["category"].unique().tolist())
BRANCH_CODES = sorted(df["branch_code"].unique().tolist())


class SingleBranchResult(BaseModel):
    code: str
    college_name: str
    branch: str
    cutoff_rank: int


class MultiBranchItem(BaseModel):
    branch: str
    cutoff_rank: int


class MultiBranchResult(BaseModel):
    code: str
    college_name: str
    branches: list[MultiBranchItem]


@app.get("/categories", response_model=list[str])
async def get_categories():
    """
    Return a JSON array of all unique category codes.
    """
    return CATEGORIES


@app.get("/branches", response_model=list[str])
async def get_branches():
    """
    Return a JSON array of all unique branch codes.
    """
    return BRANCH_CODES


@app.get("/predict", response_model=list[dict])
async def predict(
    rank: int = Query(..., gt=0, description="Your CET rank (positive integer)"),
    category: str = Query(..., description="Category code, e.g. 'GM' or '1G'"),
    branch: str = Query("", description="Optional branch code (e.g. 'AI'). If omitted, return all eligible branches per college.")
):
    """
    If 'branch' is provided: list colleges with that single branch whose cutoff_rank >= rank,
    sorted by cutoff_rank ascending.
    If 'branch' is blank: for each college, list all branches whose cutoff_rank >= rank,
    sorted by cutoff_rank ascending within each college.
    """
    # 1) Validate category
    if category not in CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown category '{category}'. Valid categories: {CATEGORIES}"
        )

    # 2) Filter DataFrame by category
    df_cat = df[df["category"] == category]

    if branch:
        # ────────── Single‐branch mode ──────────
        if branch not in df_cat["branch_code"].unique():
            raise HTTPException(
                status_code=400,
                detail=f"Unknown branch '{branch}' for category '{category}'"
            )

        # Filter and then sort by cutoff_rank ascending
        df_sb = df_cat[
            (df_cat["branch_code"] == branch) &
            (df_cat["cutoff_rank"] >= rank)
        ]
        df_sb = df_sb.sort_values(by="cutoff_rank", ascending=True)

        out = []
        for _, row in df_sb.iterrows():
            out.append({
                "code": row["college_code"],
                "college_name": row["college_name"],
                "branch": row["branch_code"],
                "cutoff_rank": int(row["cutoff_rank"])
            })
        return out

    else:
        # ────────── Multi‐branch mode ──────────
        df_mb = df_cat[df_cat["cutoff_rank"] >= rank]
        df_mb = df_mb.sort_values(by="cutoff_rank", ascending=True)

        grouped = df_mb.groupby(["college_code", "college_name"])
        out = []
        for (code, name), group in grouped:
            branches_list = []
            for _, row in group.iterrows():
                branches_list.append({
                    "branch": row["branch_code"],
                    "cutoff_rank": int(row["cutoff_rank"])
                })
            out.append({
                "code": code,
                "college_name": name,
                "branches": branches_list
            })
        return out

