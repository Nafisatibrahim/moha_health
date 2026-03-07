# Frontend build spec – AI Hospital Intake Assistant

Use this spec to build the frontend so it can be copied into the repo and used locally with the existing backend.

---

## 1. Purpose

Single-page web app: **AI Hospital Intake Assistant**. User types symptoms and answers follow-up questions; optionally uploads a vitals video. Backend does intake, extraction, rule-based triage, and vitals-based escalation. Frontend must talk to the backend via the API below and show chat + vitals + triage.

---

## 2. Backend API (base URL configurable)

Assume the backend is at a **configurable base URL** (e.g. `http://127.0.0.1:8000` locally or the Replit backend URL). All requests go to `BASE_URL + path`.

### 2.1 GET `BASE_URL/frontend-config`

**Response (JSON):**
```json
{
  "cloudinary_cloud_name": "your_cloud_name",
  "cloudinary_upload_preset": "your_preset",
  "backend_base_url": "http://127.0.0.1:8000"
}
```

Use `cloudinary_cloud_name` and `cloudinary_upload_preset` for the Cloudinary upload widget. Do **not** hardcode these; fetch from this endpoint on load. Use `backend_base_url` for all subsequent API requests (so the frontend works when deployed; backend sets this from `BACKEND_PUBLIC_URL` in production).

---

### 2.2 POST `BASE_URL/assess`

**Request body (JSON):**
```json
{
  "text": "user message string",
  "vitals": null
}
```

- `text` (string, required): current user message (symptom or answer to a question).
- `vitals` (object or null, optional): if the user has uploaded a vitals video and you received `heart_rate` and `respiration`, send them so the backend can escalate triage (e.g. HR > 110 or RR > 24 → HIGH). Example: `{ "heart_rate": 72, "respiration": 16 }`. If no vitals, send `null`.

**Response (JSON) – intake not complete:**
```json
{
  "intake_data": { "primary_symptom": "...", ... },
  "assistant_question": "Next question from AI?"
}
```

**Response (JSON) – intake complete (triage):**
```json
{
  "intake_data": { "primary_symptom": "...", "location": "...", "severity": 8, ... },
  "triage": {
    "urgency": "HIGH",
    "department": "Emergency Medicine",
    "reason": "Very severe pain reported. Elevated heart rate detected.",
    "priority_level": 1,
    "triage_message": "Urgency level HIGH. Please proceed to Emergency Medicine."
  }
}
```

- If the response has `assistant_question`, show it in the chat as the AI reply.
- If the response has `triage`, show the triage block (urgency, department, reason, and optionally `triage_message`).

---

### 2.3 POST `BASE_URL/vitals/from-url`

**Request body (JSON):**
```json
{
  "url": "https://res.cloudinary.com/.../video/upload/.../xyz.mp4"
}
```

**Response (JSON):**
```json
{
  "heart_rate": 72,
  "respiration": 16
}
```

Or on error: `{ "error": "Could not compute vitals from video" }` or `{ "error": "Failed to fetch video: ..." }`.

Use this after the user uploads a video to Cloudinary: take the video’s URL, POST it here, then use the returned `heart_rate` and `respiration` as `vitals` in subsequent `POST /assess` calls (and show them in the UI).

---

## 3. UI and behavior

### 3.1 Chat section

- **Title:** e.g. “AI Hospital Intake Assistant”.
- **Chat area:** Scrollable area showing:
  - User messages (e.g. “You: …”).
  - AI messages: either `assistant_question` (one line) or, when triage is returned, a clear **Triage** block showing:
    - Urgency
    - Department
    - Reason
    - (Optional) full triage message.
- **Input:** Text field + “Send” button.
- On Send:
  - Append user text to the chat.
  - POST to `BASE_URL/assess` with `{ "text": "<user input>", "vitals": <lastVitals or null> }`.
  - Append the AI reply and/or triage block from the response.
  - Optionally show the raw last response JSON in a debug panel.

### 3.2 Vitals-from-video section

- **Heading:** e.g. “Vitals from video”.
- **Short instructions:** e.g. “Record a 20–30 second face video on your phone or laptop, then upload the file below.”
- **Button:** “Upload vitals video” (or similar). Click opens the **Cloudinary upload widget**.
- **Cloudinary widget:**
  - Load script: `https://upload-widget.cloudinary.com/global/all.js`.
  - Config: get `cloudinary_cloud_name` and `cloudinary_upload_preset` from `GET BASE_URL/frontend-config`; use `resourceType: "auto"`, `sources: ["local", "camera", "url"]`, single file.
  - On upload success: read `result.info.secure_url`, then:
    1. POST that URL to `BASE_URL/vitals/from-url` and get `heart_rate` and `respiration`.
    2. Store them (e.g. in a `lastVitals` variable) and show them in the UI (e.g. “Presage vitals: heart_rate=X, respiration=Y”).
    3. Send a short context message to the backend: POST `BASE_URL/assess` with `text` describing that vitals were uploaded and the values, and `vitals: lastVitals`.
- If the vitals response has an `error` or missing numbers, show “not detected” (or similar) and do not treat as numeric vitals for escalation.

### 3.3 Base URL

- Make the backend base URL **configurable** (e.g. single variable or query param or small config).
- Default for local use: `http://127.0.0.1:8000`.
- Replit: use the backend’s public URL (e.g. `https://<repl>.repl.co` or whatever Replit provides).

### 3.4 Optional: debug panel

- A “Debug – last response JSON” area that shows `JSON.stringify(lastAssessResponse, null, 2)` so the user can inspect the exact payload from `POST /assess`.

---

## 4. Tech / delivery

- **Deliverable:** A single `index.html` (or a small set of static files) that works in a browser with no build step, **or** a simple static React/Vite app that compiles to static files.
- **No backend secrets in the frontend:** Cloudinary config must come from `GET /frontend-config`, not from hardcoded keys.
- **CORS:** Backend allows `*` origins; frontend can run on any origin (file://, localhost, or Replit frontend URL).

---

## 5. Copy-paste into the repo

After building:

- Replace (or add) `frontend/index.html` with the built page.
- If you use a build (e.g. Vite/React), copy the **built output** (e.g. `dist/`) into `frontend/` so the project has a single `index.html` (and assets) that can be opened or served locally.

The backend is already implemented; it expects the request/response shapes above. Once the frontend matches this spec and uses the configurable base URL, it will work locally with the existing backend.
