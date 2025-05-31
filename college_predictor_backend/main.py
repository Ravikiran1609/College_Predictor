import os
import glob
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from pydantic import BaseModel
from typing import Optional, List

# ------------------------------------------------------------------------------
# 1) Load all CSVs at startup
# ------------------------------------------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(__file__), "cet_cutoffs")

# We expect: each CSV has columns:
#    college_code, college_name, branch_code, category, cutoff_rank
#
# We'll add a "course" column to each row, based on the filename prefix.

all_dfs = []
for csv_path in glob.glob(os.path.join(DATA_DIR, "*.csv")):
    # e.g. "ENGG_CUTOFF_2024_r1_gen_prov.csv"
    fname = os.path.basename(csv_path)
    # Extract a friendly course name from the file name.
    # We'll take everything up to "_CUTOFF", e.g. "ENGG" -> "Engineering"
    # but you can adjust the logic to be more descriptive if you like.
    course_key = fname.split("_CUTOFF")[0]  # e.g. "ENGG"
    # Optionally map short keys to full names:
    course_map = {
        "ENGG": "Engineering",
        "PHARMA": "Pharmacy",
        "BSCNURS": "BSc Nursing",
        "agri": "Agriculture & FARM",
        # ... add more as needed
    }
    course_name = course_map.get(course_key, course_key)

    df = pd.read_csv(csv_path, dtype={"category": str, "branch_code": str})
    df["course"] = course_name

    # Standardize column names (in case some CSVs differ):
    df = df.rename(
        columns={
            "college_code": "college_code",
            "college_name": "college_name",
            "branch_code": "branch_code",
            "category": "category",
            "cutoff_rank": "cutoff_rank",
        }
    )
    # Ensure numeric cutoff_rank
    df["cutoff_rank"] = pd.to_numeric(df["cutoff_rank"], errors="coerce")
    all_dfs.append(df)

if not all_dfs:
    raise RuntimeError("No CSV files found in cet_cutoffs/")

master_df = pd.concat(all_dfs, ignore_index=True)

# ------------------------------------------------------------------------------
# 2) Build FastAPI app with CORS
# ------------------------------------------------------------------------------
app = FastAPI(
    title="CET College Predictor",
    description="Given a CET rank, category, (optional) branch, and selected course, predict eligible colleges.",
    version="1.0",
)

# Allow CORS from frontend (adjust origin if needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# 3) Pydantic model for a single result row
# ------------------------------------------------------------------------------
class CollegeResult(BaseModel):
    college_code: str
    college_name: str
    branch_code: str
    category: str
    cutoff_rank: int
    course: str

# ------------------------------------------------------------------------------
# 4) Endpoints
# ------------------------------------------------------------------------------

@app.get("/courses", response_model=List[str])
def get_courses():
    """
    Return list of unique courses loaded from CSV filenames.
    """
    courses = master_df["course"].sort_values().unique().tolist()
    return courses


@app.get("/categories", response_model=List[str])
def get_categories(course: str = Query(..., description="Course to filter by")):
    """
    Return list of unique categories available for the given course.
    """
    df_course = master_df[master_df["course"] == course]
    if df_course.empty:
        raise HTTPException(status_code=404, detail=f"Course '{course}' not found")
    cats = df_course["category"].dropna().sort_values().unique().tolist()
    return cats


@app.get("/branches", response_model=List[str])
def get_branches(
    course: str = Query(..., description="Course to filter by"),
):
    """
    Return list of unique branches available for the given course.
    """
    df_course = master_df[master_df["course"] == course]
    if df_course.empty:
        raise HTTPException(status_code=404, detail=f"Course '{course}' not found")
    branches = df_course["branch_code"].dropna().sort_values().unique().tolist()
    return branches


@app.get("/predict", response_model=List[CollegeResult])
def predict_colleges(
    course: str = Query(..., description="Course to filter by"),
    rank: int = Query(..., ge=1, description="Your CET rank"),
    category: str = Query(..., description="Your category (e.g. 'GM', 'SC')"),
    branch: Optional[str] = Query(None, description="Optional branch code filter"),
):
    """
    Return list of colleges for which: 
      - course matches
      - category matches
      - (optional) branch matches
      - cutoff_rank >= given rank
    Sorted ascending by cutoff_rank.
    """
    df_course = master_df[master_df["course"] == course]
    if df_course.empty:
        raise HTTPException(status_code=404, detail=f"Course '{course}' not found")

    # Filter by category
    df_filtered = df_course[df_course["category"] == category]
    if df_filtered.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No data for category '{category}' in course '{course}'",
        )

    # Optionally filter by branch
    if branch:
        df_filtered = df_filtered[df_filtered["branch_code"] == branch]
        if df_filtered.empty:
            # It's valid to return an empty list if no colleges match that branch AND category
            return []

    # Finally, filter by cutoff rank <= user's rank
    df_eligible = df_filtered[df_filtered["cutoff_rank"] >= rank]

    # Sort by cutoff_rank ascending (lowest eligible cutoffs first)
    df_eligible = df_eligible.sort_values("cutoff_rank", ascending=True)

    # Build results
    results = [
        CollegeResult(
            college_code=row["college_code"],
            college_name=row["college_name"],
            branch_code=row["branch_code"],
            category=row["category"],
            cutoff_rank=int(row["cutoff_rank"]),
            course=row["course"],
        )
        for _, row in df_eligible.iterrows()
    ]
    return results

