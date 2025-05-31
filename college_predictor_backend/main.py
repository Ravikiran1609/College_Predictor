# ─────────────────────────────────────────────────────────────────────────────
# main.py
#
# 1) On first run, reads every CSV under "cet_cutoffs/" and writes them
#    into a single SQLite table called `cutoffs`.  Then:
# 2) Exposes three FastAPI GET endpoints:
#      • /branches
#      • /categories
#      • /predict?rank=...&category=...[&branch=...]
# ─────────────────────────────────────────────────────────────────────────────
import os
import sqlite3
import pandas as pd
from fastapi import FastAPI, HTTPException, Query

app = FastAPI()
DB_PATH = "cutoffs.db"


def create_and_seed_db():
    # If the SQLite DB already exists, do nothing.
    if os.path.exists(DB_PATH):
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create the single table "cutoffs" with exactly these columns:
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cutoffs (
        college_code TEXT,
        college_name TEXT,
        branch_code TEXT,
        category TEXT,
        cutoff_rank INTEGER
    );
    """)

    # Look in "cet_cutoffs/" for *.csv files
    csv_folder = "cet_cutoffs"
    if not os.path.isdir(csv_folder):
        raise RuntimeError(f"Expected folder '{csv_folder}' to exist, but it does not.")

    for csv_file in sorted(os.listdir(csv_folder)):
        if not csv_file.lower().endswith(".csv"):
            continue

        path = os.path.join(csv_folder, csv_file)
        # Read with dtype=str so we can convert "cutoff_rank" afterward
        df = pd.read_csv(path, dtype=str)

        # Verify that required columns are present
        required_cols = ["college_code", "college_name", "branch_code", "category", "cutoff_rank"]
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"CSV file '{csv_file}' is missing columns: {missing}"
            )

        # Convert cutoff_rank → integer
        df["cutoff_rank"] = df["cutoff_rank"].astype(int)

        # Insert every row into the SQLite table
        rows = df[required_cols].values.tolist()
        cursor.executemany(
            "INSERT INTO cutoffs VALUES (?, ?, ?, ?, ?);",
            rows
        )
        print(f"  • Inserted {len(rows)} rows from {csv_file}")

    conn.commit()
    conn.close()
    print("SQLite database created at", DB_PATH)


# Seed the database on startup if needed
create_and_seed_db()


@app.get("/branches")
def list_branches():
    """
    Return a JSON array of all distinct branch_code values,
    sorted ascending (e.g. ["AI", "AR", "BT", "CA", ...]).
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT branch_code FROM cutoffs ORDER BY branch_code ASC;")
    rows = cursor.fetchall()
    conn.close()

    return [row[0] for row in rows]


@app.get("/categories")
def list_categories():
    """
    Return a JSON array of all distinct category values,
    sorted ascending (e.g. ["1G", "1K", "2AG", "2AK", ...]).
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT category FROM cutoffs ORDER BY category ASC;")
    rows = cursor.fetchall()
    conn.close()

    return [row[0] for row in rows]


@app.get("/predict")
def predict(
    rank: int = Query(..., ge=1),
    category: str = Query(...),
    branch: str | None = None
):
    """
    Query string params:
      • rank (integer, ≥ 1)      → your CET rank
      • category (string)         → e.g. "1G", "SCG", etc.
      • branch (optional string)  → e.g. "CS", "EC", "AI", etc.

    Returns an array of college records:
      [
        {
          "college_code": "...",
          "college_name": "...",
          "branch_code": "...",
          "cutoff_rank": 12345
        },
        ...
      ]

    Filter logic:
      • cutoff_rank >= given rank
      • category == given category
      • if `branch` is provided, also filter branch_code == branch
      • sort final results by cutoff_rank ASC (lowest cutoff at top).
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    if branch:
        cursor.execute(
            "SELECT college_code, college_name, branch_code, cutoff_rank "
            "FROM cutoffs "
            "WHERE category = ? AND branch_code = ? AND cutoff_rank >= ? "
            "ORDER BY cutoff_rank ASC;",
            (category, branch, rank)
        )
    else:
        cursor.execute(
            "SELECT college_code, college_name, branch_code, cutoff_rank "
            "FROM cutoffs "
            "WHERE category = ? AND cutoff_rank >= ? "
            "ORDER BY cutoff_rank ASC;",
            (category, rank)
        )

    rows = cursor.fetchall()
    conn.close()

    # Convert to list of dicts
    results = []
    for r in rows:
        results.append({
            "college_code": r[0],
            "college_name": r[1],
            "branch_code": r[2],
            "cutoff_rank": r[3]
        })

    return results

