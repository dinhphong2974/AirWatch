FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (layer cache)
COPY ai-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy training data (only the combined CSV)
COPY data_train/_combined_balanced.csv ./data_train/_combined_balanced.csv

# Copy AI service code
COPY ai-service/ ./ai-service/

WORKDIR /app/ai-service

# Model persistence directory (mount a volume here on Koyeb)
RUN mkdir -p models

ENV PORT=8000
EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT --no-access-log"]
