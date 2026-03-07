# Step-by-step deployment

Two paths:

- **Path A – Backend on Railway (or Render) + Frontend on Replit** — split deploy; Replit only for the UI.
- **Path B – Everything on Replit** — single repl; one place for code and secrets.

Use **Path A** if you want “backend elsewhere, Replit for frontend.” Use **Path B** if you prefer one repl.

---

## Path A: Backend on Railway, frontend on Replit

### Part 1 – Deploy the backend (Railway or Render)

**Option: Railway**

1. **Push your code to GitHub** (if not already). Railway deploys from this repo.

2. **Go to [railway.app](https://railway.app)** → **New Project** → **Deploy from GitHub repo** → select your repo (the one with `backend/` and `requirements.txt` at the root). Connect GitHub if prompted.

3. **Configure the service**
   - Root directory: leave default (repo root).
   - The repo includes a `railway.json` that sets:
     - Build: `pip install -r requirements.txt`
     - Start: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - If you prefer, set these in the service **Settings** → **Build / Start Command** instead.

4. **Generate a public URL**
   - Service → **Settings** → **Networking** → **Generate Domain**.
   - Copy the URL (e.g. `https://your-service-name.up.railway.app`) — this is your **backend URL**.

5. **Set environment variables**
   - Service → **Variables**. Add:

   | Name | Value |
   |------|--------|
   | `BACKEND_PUBLIC_URL` | The backend URL you just generated |
   | `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
   | `CLOUDINARY_UPLOAD_PRESET` | Your Cloudinary upload preset |
   | `BACKBOARD_API_KEY` | Your Backboard API key |

   Optional: `BACKBOARD_BASE_URL`, `BACKBOARD_ASSISTANT_ID` if needed.

6. **Redeploy and verify**
   - After saving variables, wait for deploy to finish.
   - Open `https://your-backend-url/` → API info JSON.
   - Open `https://your-backend-url/frontend-config` → JSON with `cloudinary_*` and `backend_base_url`.

**Option: Render**

1. **Go to [render.com](https://render.com)** → **Dashboard** → **New** → **Web Service**. Connect your GitHub repo.

2. **Configure**
   - **Root directory**: leave blank (repo root).
   - **Runtime**: Python 3.
   - **Build command**: `pip install -r requirements.txt`
   - **Start command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Instance type**: Free (or paid if you prefer).

3. **Environment**
   - **Environment Variables**: add `BACKEND_PUBLIC_URL` (use the URL Render gives you after first deploy, e.g. `https://your-service.onrender.com`), `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_UPLOAD_PRESET`, `BACKBOARD_API_KEY`.

4. **Deploy**
   - Click **Create Web Service**. After deploy, copy the service URL and, if you hadn’t set it yet, set `BACKEND_PUBLIC_URL` to that URL and redeploy once.

5. **Verify**
   - Open `https://your-service.onrender.com/` and `.../frontend-config` as above.

---

### Part 2 – Put the frontend on Replit

1. **Create a new Repl**
   - Go to [replit.com](https://replit.com), sign in, **Create Repl**.
   - Choose **“Import from GitHub”** and select the **same repo** (or a repo that has the `frontend/` folder), or **“Blank Repl”** and then upload/copy only the `frontend` folder contents.

2. **Use the frontend folder as the Repl root**
   - If you imported the full repo, set the Repl’s **Run** configuration so the **root** is the folder that contains `index.html`, `app.js`, `style.css` (i.e. the contents of `frontend/`).  
   - If you created a blank Repl, copy `index.html`, `app.js`, `style.css` (and any other assets) into the Repl root.

3. **Point the frontend at your backend**
   - Open `index.html` in the Repl.
   - **Uncomment** and edit the line that sets the backend URL so it uses your Railway URL:
     ```html
     <script>window.BACKEND_URL = "https://your-service-name.up.railway.app";</script>
     ```
   - It must appear **before** `<script src="app.js"></script>`.

4. **Serve the frontend**
   - Replit usually serves static files when you run a simple HTTP server. If your Repl is “static” (no server), use **Tools** → **Static Server** or add a minimal server (e.g. Node `http-server` or Python `python -m http.server`) and run it so the Repl shows the site.
   - Open the Repl’s **Webview** URL. The app should load, call `GET /frontend-config` on your Railway backend, then use that backend for chat and vitals.

5. **Test**
   - Type a message and send; you should get an AI reply.
   - Optionally upload a vitals video (Cloudinary); it should hit your Railway backend.

---

## Path B: Everything on Replit (one repl)

1. **Create a Repl** from your GitHub repo (the full project with `backend/` and `frontend/`).

2. **Set Repl Secrets** (lock icon or **Secrets** in sidebar):
   - `BACKBOARD_API_KEY` = your Backboard API key  
   - `CLOUDINARY_CLOUD_NAME` = your cloud name  
   - `CLOUDINARY_UPLOAD_PRESET` = your preset name  
   - `BACKEND_PUBLIC_URL` = your Repl’s public URL (e.g. `https://YourReplName.username.repl.co` — check the Webview URL; sometimes it’s the same as the repl URL).

3. **Run the backend**
   - In the shell (root of the repo):
     ```bash
     pip install -r requirements.txt
     uvicorn backend.main:app --host 0.0.0.0 --port 8000
     ```
   - Or add a **Run** command in the Repl config: `uvicorn backend.main:app --host 0.0.0.0 --port 8000`.

4. **Serve the frontend from the same repl**
   - **Option 1**: If Replit serves the root by default, put `index.html` at the root or configure the repl to serve the `frontend/` directory as the web root (some repls have a “Static site” or “Web” path setting).
   - **Option 2**: Mount the frontend in FastAPI (add a static mount in `main.py` for `frontend/` at `/`) so that visiting the Repl URL shows the app and the same origin is used for the API. Then the frontend will use `window.location.origin` and no `window.BACKEND_URL` is needed.

5. **Open the Repl’s web URL** and test chat + vitals.

---

## Quick checks after deploy

- Backend root: `https://your-backend-url/` → JSON with `message`, `docs`, `endpoints`.
- Frontend config: `https://your-backend-url/frontend-config` → JSON with `cloudinary_*` and `backend_base_url`.
- Frontend: Load the app, open DevTools → Network; first request should be to `.../frontend-config`, then `.../assess` when you send a message.
- If the frontend shows “Could not load frontend-config” or never gets a reply, check (1) `BACKEND_URL` / same-origin is correct, (2) backend env vars are set, (3) CORS is allowed (backend already uses `allow_origins=["*"]`).

For more detail on env vars and options, see [DEPLOYMENT.md](./DEPLOYMENT.md).
