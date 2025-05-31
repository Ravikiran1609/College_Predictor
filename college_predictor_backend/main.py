# college_predictor_backend/main.py

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import pandas as pd
import os

app = FastAPI(title="CET College Predictor (CSV Version)")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURATION:  
#   Make sure that cet_cutoffs_r1_prov.csv lives in the same folder as this file.
# ─────────────────────────────────────────────────────────────────────────────
CSV_PATH = os.path.join(os.path.dirname(__file__), "cet_cutoffs_r1_prov.csv")
if not os.path.exists(CSV_PATH):
    raise FileNotFoundError(f"Failed to find CSV at {CSV_PATH}")

# Load the entire CSV into a DataFrame at startup.
# Columns: college_code, college_name, branch_code, category, cutoff_rank
df = pd.read_csv(CSV_PATH, dtype={"college_code": str, "college_name": str,
                                  "branch_code": str, "category": str, "cutoff_rank": int})

# ─────────────────────────────────────────────────────────────────────────────
# PRE‐COMPUTE UNIQUE CATEGORIES and BRANCHES  
# ─────────────────────────────────────────────────────────────────────────────

# 1) Categories: sorted unique values in the "category" column
CATEGORIES = sorted(df["category"].unique().tolist())

# 2) Branches: We want to return a list of strings like "AI Artificial Intelligence".
#    We assume you have a separate mapping of branch_code → branch_full_name
#    in a file called branchMap.py. If not, we can programmatically infer branch_full from
#    the DataFrame (for example, if you actually have a column "branch_full"—
#    but our CSV format does NOT contain full names, only codes).
#
#    In many setups, you'd have a second CSV or a dictionary for branch_full names.
#    For simplicity, let's infer from a small dictionary here. If you have a more complete
#    branchMap.py file already (as shown in the frontend), you can import it.
try:
    from branchMap import BRANCH_MAP
except ImportError:
    # Fallback: map each code to itself if no branchMap is found.
    BRANCH_MAP = {code: code for code in df["branch_code"].unique()}

# Build a list of unique branch strings "CODE + SPACE + FULL_NAME", sorted by CODE
branch_codes_sorted = sorted(df["branch_code"].unique().tolist())
BRANCHES = []
for code in branch_codes_sorted:
    full = BRANCH_MAP.get(code, "")
    display = f"{code} {full}".strip()
    BRANCHES.append(display)

# ─────────────────────────────────────────────────────────────────────────────
# MODEL for /predict response
# ─────────────────────────────────────────────────────────────────────────────
class SingleBranchResult(BaseModel):
    code: str
    college_name: str
    branch: str
    branch_full: str
    cutoff_rank: int

class MultiBranchItem(BaseModel):
    branch: str
    branch_full: str
    cutoff_rank: int

class MultiBranchResult(BaseModel):
    code: str
    college_name: str
    branches: list[MultiBranchItem]

# ─────────────────────────────────────────────────────────────────────────────
@app.get("/categories", response_model=list[str])
async def get_categories():
    """
    Return a JSON array of all unique categories, e.g. ["1G","1K","GM","SCG",…].
    """
    return CATEGORIES


@app.get("/branches", response_model=list[str])
async def get_branches():
    """
    Return a JSON array of all unique branch strings, e.g. ["AI Artificial Intelligence", …].
    """
    return BRANCHES


@app.get("/predict", response_model=list[dict])
async def predict(
    rank: int = Query(..., gt=0, description="Your CET rank (positive integer)"),
    category: str = Query(..., description="Category code, e.g. 'GM' or '1G'"),
    branch: str = Query("", description="Optional branch code (just the code, e.g. 'AI'). If omitted, returns all eligible branches for each college.")
):
    """
    If 'branch' is provided (e.g. branch="CS"), return a list of colleges
    along with that single branch & its cutoff, where cutoff_rank <= rank.
    If 'branch' is empty (""), return one row per college with ALL eligible branches.
    """

    # 1) Validate category
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Unknown category '{category}'. Valid categories: {CATEGORIES}")

    # 2) Filter DataFrame to the selected category
    df_cat = df[df["category"] == category]

    if branch:
        # SINGLE‐BRANCH MODE: ensure branch is a valid code
        if branch not in df_cat["branch_code"].unique():
            raise HTTPException(status_code=400, detail=f"Unknown branch '{branch}' for category '{category}'")

        # Filter by branch_code == branch, and cutoff_rank <= rank
        df_sb = df_cat[(df_cat["branch_code"] == branch) & (df_cat["cutoff_rank"] <= rank)]

        # Build response list of SingleBranchResult
        out = []
        for _, row in df_sb.iterrows():
            out.append(
                {
                    "code": row["college_code"],
                    "college_name": row["college_name"],
                    "branch": row["branch_code"],
                    "branch_full": BRANCH_MAP.get(row["branch_code"], row["branch_code"]),
                    "cutoff_rank": int(row["cutoff_rank"]),
                }
            )
        return out

    else:
        # MULTI‐BRANCH MODE: we need all branches for each college whose cutoff_rank <= rank
        df_mb = df_cat[df_cat["cutoff_rank"] <= rank]

        # Group by (college_code, college_name)
        grouped = df_mb.groupby(["college_code", "college_name"])

        out = []
        for (code, name), group in grouped:
            branches_list = []
            # In this group, collect each branch row
            for _, row in group.iterrows():
                branches_list.append(
                    {
                        "branch": row["branch_code"],
                        "branch_full": BRANCH_MAP.get(row["branch_code"], row["branch_code"]),
                        "cutoff_rank": int(row["cutoff_rank"]),
                    }
                )
            out.append(
                {
                    "code": code,
                    "college_name": name,
                    "branches": branches_list,
                }
            )
        return out

