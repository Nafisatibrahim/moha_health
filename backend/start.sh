#!/bin/sh
# So PORT is expanded by the shell (Railway sets it at runtime)
exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
