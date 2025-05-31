#!/usr/bin/env python3
import os
import glob
import pandas as pd

# ──────────────────────────────────────────────────────────────
# Change these two paths if you put your CSVs somewhere else
INPUT_DIR  = "cet_cutoffs"    # folder containing the wide‐format CSVs
OUTPUT_DIR = "cet_cutoffs"    # we will write back into the same folder,
                             # but with “_normalized.csv” appended
# ──────────────────────────────────────────────────────────────

if not os.path.isdir(INPUT_DIR):
    raise RuntimeError(f"❌  Input directory does not exist: {INPUT_DIR!r}")

for in_path in glob.glob(os.path.join(INPUT_DIR, "*.csv")):
    fname = os.path.basename(in_path)  # e.g. "ENGG_CUTOFF_2024_r1_gen.csv"
    base, ext = os.path.splitext(fname)
    if base.endswith("_normalized"):
        # skip anything that is already normalized
        continue

    # Derive “course” from the first token before the first underscore
    course = base.split("_")[0]  # e.g. "ENGG" or "BSCNURS" or "PHARMA" or "agri"
    print(f"⏳  Processing {fname}  →  course = {course}")

    # Read the “wide” table
    df_wide = pd.read_csv(in_path, dtype=str, keep_default_na=False)

    # The very first column is the branch name (often called “Unnamed: 0” or similar)
    branch_col = df_wide.columns[0].strip()
    df_wide.rename(columns={df_wide.columns[0]: "branch"}, inplace=True)

    # If the branch names are split across multiple rows (e.g. “AI Artificial” on
    # row 1 and “Intelligence” on row 2), we want to forward‐fill them:
    df_wide["branch"] = df_wide["branch"].ffill()

    # Drop any “header‐placeholder” row where branch == column name
    df_wide = df_wide[df_wide["branch"].str.strip() != "branch"]

    # Now “melt” the category columns into (category, cutoff_rank)
    # All columns except “branch” become “category” headings
    melted = df_wide.melt(
        id_vars=["branch"],
        var_name="category",
        value_name="cutoff_rank",
    )

    # Remove any rows where cutoff_rank is blank or “--”
    melted = melted[~melted["cutoff_rank"].isin(["", "--", "-", "–"])]

    # Strip whitespace in category & branch
    melted["category"]   = melted["category"].str.strip()
    melted["branch"]     = melted["branch"].str.strip()
    melted["cutoff_rank"] = melted["cutoff_rank"].str.strip()

    # Insert course as the very first column
    melted.insert(0, "course", course)

    # Re‐order columns just to be safe
    melted = melted[["course", "branch", "category", "cutoff_rank"]]

    # Write out the “normalized” CSV
    out_fname = f"{base}_normalized.csv"
    out_path = os.path.join(OUTPUT_DIR, out_fname)
    melted.to_csv(out_path, index=False)
    print(f"✅  Wrote {out_fname}  →  ({len(melted):,} rows)\n")

print("🎉  All done.")

