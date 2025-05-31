# ----------------------------------------------------------------
# 1) Base image
# ----------------------------------------------------------------
FROM python:3.11-slim

# ----------------------------------------------------------------
# 2) Install Java (needed by tabula-py) and build‐essentials
#    (Use openjdk-17-jre-headless or default-jre-headless on Bookworm)
# ----------------------------------------------------------------
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
       openjdk-17-jre-headless \
       build-essential \
 && rm -rf /var/lib/apt/lists/*

# ----------------------------------------------------------------
# 3) Create and switch to /app directory
# ----------------------------------------------------------------
WORKDIR /app

# ----------------------------------------------------------------
# 4) Copy requirements.txt and install Python deps
# ----------------------------------------------------------------
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# ----------------------------------------------------------------
# 5) Copy all cutoff‐PDFs plus extract_all_cutoffs.py
#    (we will run this at build time to generate cet_cutoffs/*.csv)
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
# 6) Run the extractor so that CSVs appear in /app/cet_cutoffs/
# ----------------------------------------------------------------
RUN python extract_all_cutoffs.py

# ----------------------------------------------------------------
# 7) Copy FastAPI server code (main.py) into /app
# ----------------------------------------------------------------
COPY main.py .

# ----------------------------------------------------------------
# 8) Expose port 8000 and start Uvicorn
# ----------------------------------------------------------------
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

