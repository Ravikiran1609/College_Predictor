# file: main.py
import os
import pandas as pd
from fastapi import FastAPI, HTTPException
from typing import Optional

app = FastAPI(
    title="Multi‐Course CET College Predictor",
    description="Give me rank, category, course, and optional branch → I return eligible colleges.",
    version="1.0",
)

# Pre‐define valid course names:
VALID_COURSES = {"engineering", "pharma", "bscnurs", "agri"}

@app.get("/predict")
def predict(
    rank: int,
    category: str,
    course: str,
    branch: Optional[str] = None
):
    course = course.strip().lower()
    if course not in VALID_COURSES:
        raise HTTPException(status_code=400, detail=f"Unknown course ‘{course}’. Must be one of {VALID_COURSES}.")

    cat = category.strip().upper()
    # Determine “gen” vs “hk” by suffix—if category ends with “H”, treat as HYD/KAR:
    seat_type = "hk" if cat.endswith("H") else "gen"

    # Build the CSV filename, e.g. “engineering_gen.csv”
    filename = f"{course}_{seat_type}.csv"
    csv_path = os.path.join("cet_cutoffs", filename)

    if not os.path.isfile(csv_path):
        raise HTTPException(
            status_code=404,
            detail=f"Cutoff CSV not found for course ‘{course}’ and category ‘{category}’. Tried: {filename}"
        )

    # 1) Read the CSV into a DataFrame
    df = pd.read_csv(csv_path, dtype=str)

    # 2) Filter by Category (exact match, uppercase): 
    df = df[df["Category"].str.strip().str.upper() == cat]
    if df.empty:
        return {"eligible": []}

    # 3) Convert “Cutoff Rank” to numeric (some PDFs may leave “–” or blanks)
    df["Cutoff Rank"] = pd.to_numeric(df["Cutoff Rank"], errors="coerce")
    df = df[df["Cutoff Rank"].notna()]

    # 4) Keep only rows where “Cutoff Rank” ≤ user’s rank
    df = df[df["Cutoff Rank"] <= rank]

    # 5) If branch was provided, filter that too:
    if branch:
        br = branch.strip().upper()
        df = df[df["Branch"].str.strip().str.upper() == br]

    # 6) Sort by ascending cutoff:
    df = df.sort_values("Cutoff Rank", ascending=True)

    # 7) Return only the columns we care about
    result = df[["Code", "College Name", "Branch", "Cutoff Rank"]].to_dict(orient="records")
    return {"eligible": result}

