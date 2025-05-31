# college_predictor_backend/Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Copy only requirements first (for better Docker caching)
COPY requirements.txt ./

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code (main.py + CSV)
COPY . .

# Expose port 8000 internally (React Nginx will talk to this)
EXPOSE 8000

# Start Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

