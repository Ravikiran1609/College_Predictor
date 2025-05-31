import os
import tabula
import pandas as pd

# 1) Map each PDF filename to the desired CSV output name
PDF_TO_CSV = {
    # Engineering, General (GEN) Round 1
    "ENGG_CUTOFF_2024_r1_gen_prov.pdf":   "engineering_gen.csv",
    # Engineering, HYD/KAR (HK) Round 1
    "ENGG_CUTOFF_2024_r1_hk_prov.pdf":    "engineering_hk.csv",

    # Pharmacy, General
    "PHARMA_CUTOFF_2024_r1_gen_prov.pdf": "pharma_gen.csv",
    # Pharmacy, HYD/KAR
    "PHARMA_CUTOFF_2024_r1_hk_prov.pdf":  "pharma_hk.csv",

    # BSc Nursing, General
    "BSCNURS_CUTOFF_2024_r1_gen_prov.pdf": "bscnurs_gen.csv",
    # BSc Nursing, HYD/KAR
    "BSCNURS_CUTOFF_2024_r1_hk_prov.pdf":  "bscnurs_hk.csv",

    # Agriculture, General
    "agri_cutoff_2024_r1_gen.pdf":       "agri_gen.csv",
    # Agriculture, HYD/KAR
    "agri_cutoff_2024_r1_hk.pdf":        "agri_hk.csv",
}

# 2) Folder locations (adjust if needed)
PDF_FOLDER = os.path.join(os.path.dirname(__file__), "")  # current directory
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "cet_cutoffs")

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 3) Helper to normalize DataFrame headers (some PDFs have merged header rows)
def normalize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    If the first row contains multiple header fragments, concatenate them.
    This is PDF‐specific hack: merge multi‐index header into single row.
    """
    # If the first row contains any NaN, forward‐fill or merge strings
    if df.columns.nlevels > 1:
        # MultiIndex columns: flatten them
        new_cols = []
        for col in df.columns:
            # col might be a tuple e.g. ("College Code", "") or ("College Code", "    ")
            joined = " ".join([str(c).strip() for c in col if str(c).strip() != ""])
            new_cols.append(joined)
        df.columns = new_cols
    else:
        # If single‐level but first row seems like a header being repeated
        first_row = df.iloc[0].tolist()
        if any(str(x).lower().startswith("code") for x in first_row):
            # Promote first_row to header
            df.columns = [str(x).strip() for x in first_row]
            df = df.drop(df.index[0]).reset_index(drop=True)
    return df

# 4) For each PDF → extract all tables, concatenate, normalize, then write CSV
for pdf_name, csv_name in PDF_TO_CSV.items():
    pdf_path = os.path.join(PDF_FOLDER, pdf_name)
    out_csv_path = os.path.join(OUTPUT_DIR, csv_name)

    if not os.path.isfile(pdf_path):
        print(f"[ERROR] PDF not found: {pdf_path}")
        continue

    print(f"Extracting tables from {pdf_name} → {csv_name} ...")
    try:
        # NOTE: pages="all" will attempt to pull every table on every page
        tables = tabula.read_pdf(pdf_path, pages="all", multiple_tables=True, pandas_options={"dtype": str})
    except Exception as e:
        print(f"  [FAILED] could not read {pdf_name}: {e}")
        continue

    if not tables or len(tables) == 0:
        print(f"  [WARNING] no tables found in {pdf_name}.")
        continue

    # Concatenate all parsed tables into one DataFrame
    df_full = pd.DataFrame()
    for tbl in tables:
        if tbl.shape[1] < 2:
            # ignore extremely narrow tables
            continue
        tbl = normalize_dataframe(tbl)
        df_full = pd.concat([df_full, tbl], axis=0, ignore_index=True)

    if df_full.empty:
        print(f"  [WARNING] combined DataFrame empty for {pdf_name}.")
        continue

    # OPTIONAL: Drop any rows that are completely blank
    df_full = df_full.dropna(how="all").reset_index(drop=True)

    # Save to CSV (UTF‐8, no index)
    df_full.to_csv(out_csv_path, index=False, encoding="utf-8")
    print(f"  [OK] wrote {len(df_full)} rows into {out_csv_path}")

print("Done extracting all PDFs → CSVs.")

