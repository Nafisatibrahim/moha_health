# 🏥 Moha Health

**My own health assistant.**  
AI-powered intake that actually listens.

Built for [Hack Canada 2026](https://hackcanada.org/).

---

## Why?

In Canada, long wait times mean people sit for hours while symptoms can get worse. Moha Health **streamlines the first step**: you describe how you feel, optionally share a symptom image or a short video for vitals, and an AI **intake nurse** guides you through structured questions. When needed, a **specialist** (dermatology, dental, cardiology) asks a few follow-ups. You get a **triage result** and a simple clinical-style report so urgent care can be **flagged early**. It doesn’t replace a real doctor, but it makes the path to the right care clearer and faster.

Think of it as a **smart front desk**: multi-agent flow, voice in/out, vitals from video, and optional Auth0 so returning users can keep a health profile.

---

## ✨ Features

| Feature | What it does |
|--------|----------------|
| **Conversational intake** | AI nurse collects symptom, location, severity, duration; asks only what’s missing. |
| **Smart routing** | After intake, a router suggests a specialist (dermatology, dental, cardiology) when it fits. |
| **Specialist follow-up** | Domain-specific AI asks 1 to 3 focused questions before triage. |
| **Triage + report** | Rule-based urgency and a readable report (plus JSON for downstream use). |
| **Voice** | Text-to-speech (ElevenLabs) and speech-to-text so you can talk instead of type. |
| **Vitals from video** | Upload a short face video → heart rate & respiration (Presage). |
| **Symptom images** | Optional photo/URL; attached to the conversation for the AI. |
| **Health profile** | Optional past surgeries, meds, etc.; stored per user when Auth0 is enabled. |

---

## 🛠 Tech stack

- **Backend:** FastAPI, Python 3.11, [Google Gemini](https://ai.google.dev/) (via [Backboard](https://app.backboard.io)) for LLM orchestration, ElevenLabs (voice), Presage (vitals), Cloudinary (uploads).
- **Frontend:** React, TypeScript, Vite, Tailwind, shadcn/ui, i18n, optional Auth0.
- **Deploy:** Backend on [Railway](https://railway.app); frontend runs anywhere (e.g. [Replit](https://replit.com)) and points at the backend URL. [Tailscale](https://tailscale.com) for secure networking where needed.

---

## 🚀 Quick start

### 1. Clone and env

```bash
git clone https://github.com/Nafisatibrahim/moha_health.git
cd moha_health
cp .env.example .env
```

Edit `.env`: add your **Backboard API key**, Cloudinary (if using uploads), ElevenLabs (voice), Presage (vitals), and optionally Auth0. Don’t commit `.env`.

### 2. Backend (local)

```bash
pip install -r requirements.txt
python main.py
```

API: [http://127.0.0.1:8000](http://127.0.0.1:8000) · Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Frontend (local)

```bash
npm install
npm run dev
```

Open the URL Vite prints (e.g. `http://localhost:5173`). The app will use `/frontend-config` from the backend; for local dev the backend’s `BACKEND_PUBLIC_URL` (or default) should match where the API runs.

### 4. Deploy backend (Railway)

- Connect the repo to Railway; use the **Dockerfile** (start command: `python main.py`).
- Set **Variables:** `BACKBOARD_API_KEY`, `BACKEND_PUBLIC_URL` (your Railway URL), Cloudinary, ElevenLabs, Presage, etc.
- Generate a domain → e.g. `https://yourapp.up.railway.app`.

### 5. Run frontend on Replit

- In Replit, set **Secrets:** `VITE_BACKEND_URL` = your Railway backend URL.
- Ensure Railway’s `/frontend-config` returns that URL in `backend_base_url` (set `BACKEND_PUBLIC_URL` on Railway).
- For Auth0: add `VITE_AUTH0_DOMAIN` and `VITE_AUTH0_CLIENT_ID` in Replit and allow the Replit origin in Auth0.

---

## 📁 Project layout

```
moha_health/
├── backend/           # FastAPI app
│   ├── main.py        # Routes: /assess, /vitals, /speak, /transcribe, /frontend-config, etc.
│   ├── integrations/  # Backboard client
│   ├── services/      # Intake, triage, routing, report, voice, vitals
│   ├── prompts/       # Intake, router, specialist prompts
│   └── tools/         # Triage tool for agents
├── client/            # React + Vite frontend
│   └── src/
│       ├── pages/     # Intake, Home, Profile, About, Contact
│       └── components/
├── main.py            # Production entrypoint (reads PORT, runs uvicorn)
├── Dockerfile         # Backend image for Railway
├── railway.json       # Railway: DOCKERFILE + start command
└── requirements.txt   # Python deps
```

---

## 🔌 API at a glance

| Method | Path | What |
|--------|------|------|
| GET | `/` | API info |
| GET | `/docs` | Swagger UI |
| GET | `/frontend-config` | Cloudinary, backend URL, Auth0 (non-secret) |
| POST | `/assess` | Main flow: send message, get reply or triage report |
| POST | `/vitals` | Upload video → heart rate, respiration |
| POST | `/vitals/from-url` | Vitals from video URL |
| POST | `/speak` | Text → MP3 (ElevenLabs) |
| POST | `/transcribe` | Audio file → text |
| GET/PUT | `/profile/health` | Get/set health profile by `patient_id` |

---

## 🙏 Sponsors & thanks

This project was built at [Hack Canada 2026](https://hackcanada.org/) (Major League Hacking 2026 season). Huge thanks to the sponsors and tools that made it possible:

<p align="center">
  <a href="https://ai.google.dev/"><img src="assets/Google_2015_logo.svg.png" alt="Google Gemini" height="40"></a>
  &nbsp;
  <a href="https://tailscale.com"><img src="assets/tailscale.png" alt="Tailscale" height="40"></a>
  &nbsp;
  <a href="https://stan.com"><img src="assets/stan.png" alt="Stan" height="40"></a>
  &nbsp;
  <a href="https://cloudinary.com"><img src="assets/cloudinary.png" alt="Cloudinary" height="40"></a>
  &nbsp;
  <a href="https://app.backboard.io"><img src="assets/backboard.png" alt="Backboard" height="40"></a>
  &nbsp;
  <a href="https://elevenlabs.io"><img src="assets/11elevenlabs.png" alt="ElevenLabs" height="40"></a>
  &nbsp;
  <a href="https://github.com"><img src="assets/github.png" alt="GitHub" height="40"></a>
</p>

<p align="center">
  <a href="https://hackcanada.org/"><img src="assets/hackCanada2026.png" alt="Hack Canada 2026" height="50"></a>
  &nbsp;&nbsp;
  <a href="https://mlh.io"><img src="assets/mlh-logo.png" alt="Major League Hacking" height="50"></a>
</p>

---

## 👤 Author

**Nafisat Ibrahim**

- Website: [nafisatibrahim.com](https://nafisatibrahim.com/)
- LinkedIn: [linkedin.com/in/nafisatibrahim](https://www.linkedin.com/in/nafisatibrahim/)
- GitHub: [github.com/Nafisatibrahim](https://github.com/Nafisatibrahim)

---

## 📜 License

See [LICENSE](LICENSE).

---

**Repo:** [github.com/Nafisatibrahim/moha_health](https://github.com/Nafisatibrahim/moha_health)
