# Backend only — avoids Nixpacks Node/Python conflict on Railway
FROM python:3.11-slim

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend (needed for uvicorn backend.main:app)
COPY backend ./backend

# Start script expands $PORT at runtime (Railway sets PORT)
RUN chmod +x backend/start.sh
ENV PORT=8000
EXPOSE 8000
CMD ["./backend/start.sh"]
