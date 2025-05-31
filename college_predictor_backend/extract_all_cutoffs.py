import os
import glob
import tabula
import pandas as pd

# --------------------------------------------------------------------------------
# 1) Adjust these paths as needed:
#
#    - PDF_DIR: where all of your PDF files currently live.
#    - OUT_DIR: where you want the CSVs to be written (i.e. ./cet_cutoffs).
#
PDF_DIR = "./"  # assumes this script lives in the same directory as the PDFs
OUT_DIR = "cet_cutoffs"

# 2) List all of the PDFs you want to convert.
#    We expect the following PDFs to be present in PDF_DIR:
#
#      ENGG_CUTOFF_2024_r1_gen_prov.pdf
#      ENGG_CUTOFF_2024_r1_hk_prov.pdf
#      agri_cutoff_2024_r1_gen.pdf
#      agri_cutoff_2024_r1_hk.pdf
#      PHARMA_CUTOFF_2024_r1_gen_prov.pdf
#      PHARMA_CUTOFF_2024_r1_hk_prov.pdf
#      BSCNURS_CUTOFF_2024_r1_gen_prov.pdf
#      BSCNURS_CUTOFF_2024_r1_hk_prov.pdf
#
PDF_FILENAMES = [
    "ENGG_CUTOFF_2024_r1_gen_prov.pdf",
    "ENGG_CUTOFF_2024_r1_hk_prov.pdf",
    "agri_cutoff_2024_r1_gen.pdf",
    "agri_cutoff_2024_r1_hk.pdf",
    "PHARMA_CUTOFF_2024_r1_gen_prov.pdf",
    "PHARMA_CUTOFF_2024_r1_hk_prov.pdf",
    "BSCNURS_CUTOFF_2024_r1_gen_prov.pdf",
    "BSCNURS_CUTOFF_2024_r1_hk_prov.pdf",
]

# --------------------------------------------------------------------------------
# Make sure the output directory exists:
os.makedirs(OUT_DIR, exist_ok=True)

# Helper function: given a PDF path, return a "nice" CSV filename
def make_csv_name(pdf_filename):
    """
    Turn e.g. 'ENGG_CUTOFF_2024_r1_gen_prov.pdf'
    into      'ENGG_CUTOFF_2024_r1_gen.csv'
    (i.e. strip off the '_prov.pdf', keep '_gen' or '_hk', then add .csv)
    """
    base = os.path.basename(pdf_filename)
    # remove any trailing '_prov.pdf' or '.pdf'
    if base.lower().endswith("_prov.pdf"):
        base = base[: -len("_prov.pdf")]
    elif base.lower().endswith(".pdf"):
        base = base[: -len(".pdf")]
    # enforce lower‐case .csv
    return f"{base}.csv"


# --------------------------------------------------------------------------------
# Loop over each PDF, read with tabula, and write out a CSV.
for pdf_name in PDF_FILENAMES:
    pdf_path = os.path.join(PDF_DIR, pdf_name)
    if not os.path.isfile(pdf_path):
        print(f"⚠️  Skipping missing file: {pdf_path}")
        continue

    # 1) Read all pages into a list of DataFrames.
    #
    #    We tell tabula to guess the table areas on each page.
    #    In some PDFs, you may need to tweak `lattice=True` vs. `stream=True`.
    #
    try:
        dfs = tabula.read_pdf(pdf_path,
                              pages="all",
                              multiple_tables=True,
                              guess=True)
    except Exception as e:
        print(f"✖️  Failed to read {pdf_path} with tabula: {e}")
        continue

    # 2) Concatenate all of the DataFrames for that PDF into one large DataFrame.
    #    We assume each "table chunk" has the same columns once read.
    if not dfs:
        print(f"⚠️  No tables found in {pdf_path}.")
        continue

    # Some PDFs may produce a small leftover table or header‐only chunk.
    # We will concatenate them anyway; downstream you can drop any empty‐column rows.
    full_df = pd.concat(dfs, axis=0, ignore_index=True)

    # 3) Clean up column names (optional):
    #    Often tabula will produce column names like ["Unnamed: 0", "Department", "Cutoff Rank", ...]
    #    We can try to "auto‐rename" if we detect known headings. Otherwise, keep as is.
    #
    #    Expected final CSV format (five columns):
    #
    #      college_code,college_name,branch_code,category,cutoff_rank
    #
    #    In many of these PDFs, the first column is "College Code", the next is "College Name",
    #    then "Branch Code", "Category", "Cutoff Rank".
    #
    #    If your DataFrame's first five columns match those headings exactly, we'll rename them.
    #    Otherwise, leave them unchanged.
    col_mapping = {}
    lower_cols = [c.lower() for c in full_df.columns]

    if "college code" in lower_cols:
        idx = lower_cols.index("college code")
        col_mapping[full_df.columns[idx]] = "college_code"
    if "college name" in lower_cols:
        idx = lower_cols.index("college name")
        col_mapping[full_df.columns[idx]] = "college_name"
    if "branch code" in lower_cols:
        idx = lower_cols.index("branch code")
        col_mapping[full_df.columns[idx]] = "branch_code"
    if "category" in lower_cols:
        idx = lower_cols.index("category")
        col_mapping[full_df.columns[idx]] = "category"
    # sometimes the PDF header says "Cutoff Rank" or just "Rank"
    for name in full_df.columns:
        if "cutoff" in name.lower() and "rank" in name.lower():
            col_mapping[name] = "cutoff_rank"
        elif name.lower().strip() == "rank":
            col_mapping[name] = "cutoff_rank"

    # Apply the renaming if we found any keys
    if col_mapping:
        full_df = full_df.rename(columns=col_mapping)

    # 4) (Optional) Drop any columns beyond these five, if they exist.
    expected_cols = ["college_code", "college_name", "branch_code", "category", "cutoff_rank"]
    keep_cols = [c for c in expected_cols if c in full_df.columns]
    full_df = full_df[keep_cols]

    # 5) Save to CSV in OUT_DIR
    out_csv = os.path.join(OUT_DIR, make_csv_name(pdf_name))
    full_df.to_csv(out_csv, index=False)
    print(f"✅  Wrote {out_csv}")

