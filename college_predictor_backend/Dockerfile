# 1) Use a Python base image
FROM python:3.11-slim

# 2) Install Java (tabula-py requires Java) and build essentials
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
       openjdk-11-jre-headless \
       build-essential \
 && rm -rf /var/lib/apt/lists/*

# 3) Set working directory
WORKDIR /app

# 4) Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5) Copy the PDFs and the extraction script
COPY ENGG_CUTOFF_2024_r1_*       ./ 
COPY PHARMA_CUTOFF_2024_r1_*     ./
COPY BSCNURS_CUTOFF_2024_r1_*    ./
COPY agri_cutoff_2024_r1_*       ./
COPY extract_all_cutoffs.py      ./

# 6) Run the extraction so that CSVs are generated at build time
RUN python extract_all_cutoffs.py

# 7) Copy rest of the backend code (main.py, etc.)
COPY main.py                    .
COPY cet_cutoffs/               cet_cutoffs/   # (after extraction, cet_cutoffs/ exists)

# 8) Expose port and start the app
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

