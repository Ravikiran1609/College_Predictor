FROM python:3.11-slim

WORKDIR /app

# 1) Copy requirements and install
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt uvicorn

# 2) Copy everything else (including cet_cutoffs folder and main.py)
COPY . .

# 3) Expose port and run Uvicorn
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

