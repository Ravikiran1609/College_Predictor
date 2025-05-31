import os
import tabula
import pandas as pd

# ----------------------------------------------------------------
# 1) Map each PDF to its output‐CSV name
# ----------------------------------------------------------------
PDF_TO_CSV = {
    "ENGG_CUTOFF_2024_r1_gen_prov.pdf":    "engineering_gen.csv",
    "ENGG_CUTOFF_2024_r1_hk_prov.pdf":     "engineering_hk.csv",
    "PHARMA_CUTOFF_2024_r1_gen_prov.pdf":  "pharma_gen.csv",
    "PHARMA_CUTOFF_2024_r1_hk_prov.pdf":   "pharma_hk.csv",
    "BSCNURS_CUTOFF_2024_r1_gen_prov.pdf": "bscnurs_gen.csv",
    "BSCNURS_CUTOFF_2024_r1_hk_prov.pdf":  "bscnurs_hk.csv",
    "agri_cutoff_2024_r1_gen.pdf":         "agri_gen.csv",
    "agri_cutoff_2024_r1_hk.pdf":          "agri_hk.csv",
}

PDF_FOLDER = os.path.dirname(__file__)
OUTPUT_DIR = os.path.join(PDF_FOLDER, "cet_cutoffs")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Flatten multi‐row PDF headers or promote the first row as header if needed.
    """
    # If columns are a MultiIndex, flatten them by joining non‐empty pieces
    if df.columns.nlevels > 1:
        new_cols = []
        for col in df.columns:
            # col is a tuple, e.g. (" College Code ", "") or (" College Code ", "Some subheader")
            joined = " ".join([str(c).strip() for c in col if str(c).strip() != ""])
            new_cols.append(joined)
        df.columns = new_cols
    else:
        # Single‐level columns might have the actual header in row 0
        first_row = df.iloc[0].tolist()
        if any(str(x).lower().startswith("code") for x in first_row):
            df.columns = [str(x).strip() for x in first_row]
            df = df.drop(df.index[0]).reset_index(drop=True)
    return df

# ----------------------------------------------------------------
# 2) Loop over each PDF → read all pages’ tables → concat → normalize → write CSV
# ----------------------------------------------------------------
for pdf_name, csv_name in PDF_TO_CSV.items():
    pdf_path = os.path.join(PDF_FOLDER, pdf_name)
    out_csv_path = os.path.join(OUTPUT_DIR, csv_name)

    if not os.path.isfile(pdf_path):
        print(f"[ERROR] PDF not found: {pdf_path}")
        continue

    print(f"Extracting tables from {pdf_name} → {csv_name} ...")
    try:
        tables = tabula.read_pdf(
            pdf_path,
            pages="all",
            multiple_tables=True,
            pandas_options={"dtype": str},
        )
    except Exception as e:
        print(f"  [FAILED] Could not read {pdf_name}: {e}")
        continue

    if not tables:
        print(f"  [WARNING] No tables found in {pdf_name}")
        continue

    df_full = pd.DataFrame()
    for tbl in tables:
        if tbl.shape[1] < 2:
            # skip very narrow “junk” tables
            continue
        tbl = normalize_dataframe(tbl)
        df_full = pd.concat([df_full, tbl], axis=0, ignore_index=True)

    df_full = df_full.dropna(how="all").reset_index(drop=True)
    if df_full.empty:
        print(f"  [WARNING] Combined DataFrame is empty for {pdf_name}")
        continue

    df_full.to_csv(out_csv_path, index=False, encoding="utf-8")
    print(f"  [OK] Wrote {len(df_full)} rows → {out_csv_path}")

print("All PDFs have been converted to CSVs under cet_cutoffs/")

