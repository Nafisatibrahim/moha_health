# Backend only — avoids Nixpacks Node/Python conflict on Railway
FROM python:3.11-slim

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and root entrypoint
COPY backend ./backend
COPY main.py .

# Ensure backend package resolves when running from /app (python main.py)
ENV PYTHONPATH=/app
ENV PORT=8000
EXPOSE 8000
CMD ["python", "main.py"]
