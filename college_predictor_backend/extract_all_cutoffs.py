# ─────────────────────────────────────────────────────────────────────────────
# extract_all_cutoffs.py
#
# Scan for all “*_CUTOFF_2024_r1_*.pdf” files in the current directory,
# read their tables via Tabula-Py, and write out CSVs under “cet_cutoffs/”.
# ─────────────────────────────────────────────────────────────────────────────
import os
import glob
import tabula
import pandas as pd

# -------------------------------------------------------------------
# 1) Directory where the PDFs live (this script is run from /app)
# -------------------------------------------------------------------
PDF_DIR = os.getcwd()

# -------------------------------------------------------------------
# 2) Create output folder (if it doesn’t already exist)
# -------------------------------------------------------------------
CSV_OUT = os.path.join(PDF_DIR, "cet_cutoffs")
os.makedirs(CSV_OUT, exist_ok=True)

# -------------------------------------------------------------------
# 3) Find all matching “_CUTOFF_2024_r1_*.pdf” files
#    (e.g. “ENGG_CUTOFF_2024_r1_gen_prov.pdf”, etc.)
# -------------------------------------------------------------------
pattern = os.path.join(PDF_DIR, "*_CUTOFF_2024_r1_*.pdf")
pdf_list = glob.glob(pattern)

if not pdf_list:
    print("⚠️  No PDF files found matching pattern:", pattern)
else:
    print(f"✅  Found {len(pdf_list)} PDF(s) to extract.")

# -------------------------------------------------------------------
# 4) For each PDF, extract all tables and concatenate
# -------------------------------------------------------------------
for pdf_path in pdf_list:
    base = os.path.basename(pdf_path)
    name, _ext = os.path.splitext(base)
    out_csv = os.path.join(CSV_OUT, name + ".csv")

    print(f"→ Processing {base} ...")

    try:
        # read_pdf with lattice=True often captures well-structured tables
        # You can also try `stream=True` if that works better
        df_list = tabula.read_pdf(
            pdf_path,
            pages="all",
            lattice=True,
            multiple_tables=True,
            pandas_options={"dtype": str}
        )
    except Exception as e:
        print(f"   ✗ Error reading {base}: {e}")
        continue

    if not df_list:
        print(f"   ⚠️ No tables detected in {base}. Skipping writing CSV.")
        continue

    # Concatenate all page-tables into a single DataFrame
    try:
        combined = pd.concat(df_list, ignore_index=True)
    except ValueError:
        # If there is only one table, df_list is a single DataFrame
        combined = df_list[0]

    # Write out the combined CSV
    combined.to_csv(out_csv, index=False)
    print(f"   ✅ Wrote {out_csv} ({combined.shape[0]} rows, {combined.shape[1]} cols)")

print("🎉 Extraction complete. CSVs are under:", CSV_OUT)

