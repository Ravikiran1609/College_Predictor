FROM python:3.11-slim

WORKDIR /app

# 1) Copy requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2) Copy everything else (code + PDFs + CSVs)
COPY . .

# 3) (Optional) Run the extraction script at build time if you prefer
#    In many setups you might generate the CSVs locally and then just COPY them.
#    If you want to extract at build-time, uncomment the next line:
RUN python extract_all_cutoffs.py

# 4) Ensure the cet_cutoffs folder (with all .csv) is present in the image
#    If you ran extract_all_cutoffs.py above, they already live in cet_cutoffs/.

# 5) Expose and run your FastAPI app
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

