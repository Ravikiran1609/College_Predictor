import os
from typing import List

from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import databases

DATABASE_URL = "sqlite:///./cutoffs.db"
database = databases.Database(DATABASE_URL)

app = FastAPI(
    title="CET College Predictor",
    description="Given a CET rank, category, and branch, returns all colleges whose cutoff rank ≥ provided rank.",
    version="1.0.0",
)


class CollegePrediction(BaseModel):
    college_code: str
    college_full_name: str
    branch: str
    category: str
    cutoff_rank: int


@app.on_event("startup")
async def startup():
    await database.connect()


@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()


@app.get(
    "/predict",
    response_model=List[CollegePrediction],
    summary="Predict eligible colleges based on CET rank, category, branch",
    description=(
        "Returns a list of colleges where the cutoff rank "
        "(for the given branch & category) is ≥ provided CET rank. "
        "Results are sorted by cutoff_rank ascending."
    ),
)
async def predict_colleges(
    rank: int = Query(..., ge=0, description="Your CET rank (e.g., 12345)"),
    category: str = Query(
        ..., min_length=2, max_length=4, description="Category code (e.g., GM, 1G, 2AG, etc.)"
    ),
    branch: str = Query(
        ..., min_length=2, max_length=4, description="Branch code (e.g., CS, EC, ME, etc.)"
    ),
):
    category = category.strip().upper()
    branch = branch.strip().upper()

    query = """
        SELECT 
            c.college_code,
            c.college_full_name,
            t.branch,
            t.category,
            t.cutoff_rank
        FROM colleges AS c
        JOIN cutoffs AS t ON c.college_code = t.college_code
        WHERE t.category = :category
          AND t.branch = :branch
          AND t.cutoff_rank >= :rank
        ORDER BY t.cutoff_rank ASC
        ;
    """

    values = {"category": category, "branch": branch, "rank": rank}
    rows = await database.fetch_all(query=query, values=values)

    results = [
        CollegePrediction(
            college_code=row["college_code"],
            college_full_name=row["college_full_name"],
            branch=row["branch"],
            category=row["category"],
            cutoff_rank=row["cutoff_rank"],
        )
        for row in rows
    ]
    return results


@app.get("/", include_in_schema=False)
async def root():
    return {"message": "CET College Predictor API is running. Use /predict?rank=&category=&branch="}


# ─────────────────────────────────────────────────────────────────────────────
# NEW: Return a list of all distinct branches
@app.get(
    "/branches",
    summary="Get all distinct branch codes",
    description="Returns a list of all distinct branch codes (e.g. CS, EC, ME, etc.) available in the database.",
    response_model=List[str],
)
async def list_branches():
    query = "SELECT DISTINCT branch FROM cutoffs ORDER BY branch;"
    rows = await database.fetch_all(query=query)
    return [row["branch"] for row in rows]


# NEW: Return a list of all distinct categories
@app.get(
    "/categories",
    summary="Get all distinct category codes",
    description="Returns a list of all distinct category codes (e.g. GM, 1G, 2AG, etc.) available in the database.",
    response_model=List[str],
)
async def list_categories():
    query = "SELECT DISTINCT category FROM cutoffs ORDER BY category;"
    rows = await database.fetch_all(query=query)
    return [row["category"] for row in rows]
# ─────────────────────────────────────────────────────────────────────────────


