# ----------------------------------------------------------------
# 1) Choose a slim Python base (Debian Bookworm underneath)
# ----------------------------------------------------------------
FROM python:3.11-slim

# ----------------------------------------------------------------
# 2) Install a headless Java runtime (needed by tabula‐py) + build tools
# ----------------------------------------------------------------
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
       openjdk-17-jre-headless \
       build-essential \
 && rm -rf /var/lib/apt/lists/*

# ----------------------------------------------------------------
# 3) Switch into /app
# ----------------------------------------------------------------
WORKDIR /app

# ----------------------------------------------------------------
# 4) Copy and install Python dependencies (NumPy, pandas, tabula‐py, FastAPI, etc.)
#    We pinned numpy/pandas/tabula‐py in requirements.txt to avoid ABI mismatches
# ----------------------------------------------------------------
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ----------------------------------------------------------------
# 5) Copy all eight cutoff‐PDFs and our PDF→CSV script into /app
# ----------------------------------------------------------------
COPY ENGG_CUTOFF_2024_r1_gen_prov.pdf    ./
COPY ENGG_CUTOFF_2024_r1_hk_prov.pdf     ./
COPY PHARMA_CUTOFF_2024_r1_gen_prov.pdf  ./
COPY PHARMA_CUTOFF_2024_r1_hk_prov.pdf   ./
COPY BSCNURS_CUTOFF_2024_r1_gen_prov.pdf ./
COPY BSCNURS_CUTOFF_2024_r1_hk_prov.pdf  ./
COPY agri_cutoff_2024_r1_gen.pdf         ./
COPY agri_cutoff_2024_r1_hk.pdf          ./
COPY extract_all_cutoffs.py             ./

# ----------------------------------------------------------------
# 6) Run PDF→CSV conversion now (inside the image).
#    This will create /app/cet_cutoffs/{eight CSV files}
# ----------------------------------------------------------------
RUN python extract_all_cutoffs.py

# ----------------------------------------------------------------
# 7) Copy our FastAPI server (“main.py”) into /app
# ----------------------------------------------------------------
COPY main.py .

# ----------------------------------------------------------------
# 8) Expose port and launch Uvicorn
# ----------------------------------------------------------------
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

