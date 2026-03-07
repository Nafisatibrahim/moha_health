# Deployment guide – AI Hospital Intake Assistant

## Will it work when deployed?

**Yes**, if you:

1. Set **environment variables** on the backend (see below).
2. Ensure the **frontend can reach the backend** (same origin or set `BACKEND_PUBLIC_URL` and, for split deploy, `window.BACKEND_URL`).

The app is deployment-ready: the backend serves `backend_base_url` from env, and the frontend uses that (or same-origin) for all API calls.

---

## Environment variables (backend)

Set these where the backend runs (Replit Secrets, Railway/Render env, etc.):

| Variable | Required | Description |
|----------|----------|-------------|
| `BACKEND_PUBLIC_URL` | For production | Public URL of the backend (e.g. `https://your-app.repl.co` or `https://your-api.railway.app`). Used in `GET /frontend-config` so the frontend can call the correct API. Omit for local dev (defaults to `http://127.0.0.1:8000`). |
| `CLOUDINARY_CLOUD_NAME` | Yes (for video upload) | Cloudinary cloud name. |
| `CLOUDINARY_UPLOAD_PRESET` | Yes (for video upload) | Cloudinary unsigned upload preset (e.g. for video). |
| `BACKBOARD_API_KEY` | Yes (for intake/triage) | Backboard API key. |
| `BACKBOARD_BASE_URL` | Optional | Backboard API base URL if not default. |
| `BACKBOARD_ASSISTANT_ID` | Optional | Assistant ID if required. |

Root `.env` is used for local development; do **not** commit secrets. In production, use the platform’s env/secrets.

---

## Frontend ↔ backend URL

- **Same origin (recommended for hackathon)**  
  If the frontend is served from the same host as the API (e.g. Replit: frontend at `https://your-repl.repl.co` and API at `https://your-repl.repl.co` or same backend serving static files), the app uses `window.location.origin` as the API base. Set `BACKEND_PUBLIC_URL` to that same URL so `/frontend-config` returns it.

- **Split deploy (frontend and backend on different hosts)**  
  Set `BACKEND_PUBLIC_URL` on the backend to the public API URL. In the frontend, set the backend URL before loading `app.js`, e.g. in `index.html`:

  ```html
  <script>window.BACKEND_URL = "https://your-backend.railway.app";</script>
  <script src="app.js"></script>
  ```

  You can inject `window.BACKEND_URL` from a build env (e.g. Vite/Railway) or from a small config endpoint if the frontend is on the same backend domain.

---

## Deployment options

### Option A: Replit (single repl)

1. Backend: run `uvicorn backend.main:app --host 0.0.0.0 --port 8000` (or use Replit’s run config).
2. Serve the frontend from the same repl (e.g. mount `frontend/` at `/` or use a static server). Same origin → no `window.BACKEND_URL` needed.
3. Set Secrets: `BACKBOARD_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`, and `BACKEND_PUBLIC_URL` = your Replit app URL (e.g. `https://your-repl.username.repl.co`).

### Option B: Backend elsewhere + Replit frontend

1. **Backend** (Railway, Render, Fly.io, etc.): Deploy `backend/main.py` (e.g. `uvicorn main:app --host 0.0.0.0 --port $PORT`). Set env vars: `BACKEND_PUBLIC_URL` = your backend’s public URL (e.g. `https://your-app.railway.app`), plus Cloudinary and Backboard keys. CORS already allows `*`, so the Replit frontend can call it.
2. **Frontend on Replit**: In `frontend/index.html`, set the backend URL before `app.js` so the first request goes to your API:
   ```html
   <script>window.BACKEND_URL = "https://your-backend.railway.app";</script>
   <script src="app.js"></script>
   ```
   Replace with your real backend URL. Serve the `frontend/` folder as static files (Replit web server or static hosting). No backend env needed on Replit; all API keys stay on the deployed backend.

### Option C: Railway / Render (backend) + other static frontend (Vercel, Netlify)

1. Deploy the backend; set `BACKEND_PUBLIC_URL` to the backend URL.
2. Deploy the frontend (Vercel, Netlify, etc.). Set `window.BACKEND_URL` in `index.html` to that backend URL (or inject at build time from env).
3. CORS in `main.py` already allows all origins; tighten `allow_origins` in production if you prefer.

### Option D: Single server (e.g. VPS, Docker)

1. Run FastAPI and serve `frontend/` as static files from the same host. Same origin → use `BACKEND_PUBLIC_URL` = that host’s URL.
2. Or run backend and nginx; nginx serves `frontend/` and proxies `/api` to the backend; frontend uses relative paths or `window.BACKEND_URL` = `https://your-domain/api`.

---

**Step-by-step instructions:** See [docs/DEPLOY_STEPS.md](DEPLOY_STEPS.md) for numbered steps (Railway or Render backend + Replit frontend, or all-on-Replit).

---

## Checklist before go-live

- [ ] All backend env vars set (especially `BACKBOARD_API_KEY`, Cloudinary, `BACKEND_PUBLIC_URL`).
- [ ] Frontend can load `GET /frontend-config` (and gets correct `backend_base_url`).
- [ ] CORS allows your frontend origin if backend and frontend are on different domains.
- [ ] Cloudinary preset allows video uploads and CORS if needed.

---

## In-memory state (hackathon caveat)

Intake and conversation state are in-memory. Restarting the backend or running multiple instances will lose state. For production you’d add a store (e.g. Redis or DB) keyed by session/thread.
