# Replit: UI Source Files & Architecture / Values Prompt

Use this when working on the UI in Replit or when briefing Replit (or another AI) on the current architecture and trackable values.

---

## 1. Which files to use for copy-paste (Replit UI)

- **Single main file for the Intake experience (chat, stepper, vitals, triage, report):**  
  **`client/src/pages/Intake.tsx`**  
  Copy this file when you want to paste the full Intake UI into Replit or sync your local Intake page with Replit.

- **Full UI (if Replit runs the same React app):**  
  Copy the whole **`client/src/`** tree so Replit has:
  - `client/src/pages/Intake.tsx`, `Profile.tsx`, `Home.tsx`, `About.tsx`, `Contact.tsx`, `not-found.tsx`
  - `client/src/App.tsx`, `client/src/main.tsx`
  - `client/src/components/layout/Layout.tsx`, `Navbar.tsx`, `Footer.tsx`
  - `client/src/components/ui/*` (button, card, dialog, input, etc.)
  - `client/src/locales/en.json`, `fr.json`, `es.json`
  - `client/src/lib/auth0-context.tsx`, `utils.ts`, `queryClient.ts`
  - `client/index.html`, `client/vite.config.ts`, `package.json`, etc.

- **Built static output (no build on Replit):**  
  Run **`npm run build`** inside **`client/`**, then copy the contents of **`client/dist/`** into Replit’s **`frontend/`** (or wherever Replit serves static files). That gives you a single `index.html` and assets to open or serve.

**Summary:** For “perfecting the UI” in Replit, the main file to copy-paste is **`client/src/pages/Intake.tsx`**. For a full match to local, copy **`client/src/`** (and build there) or copy **`client/dist/`** after building locally.

---

## 2. Prompt to give Replit: current architecture and values

Copy the block below into Replit (or any AI) so it understands this is a **multi-agent intake app**, not a simple chatbot, and knows which **values are tracked** and can be used for UI or analytics.

---

```
This app is an AI Hospital Intake Assistant. It is not a simple chatbot.

## Architecture: multi-agent flow

1. **Intake (general) phase**  
   - One AI agent (general physician / intake nurse) asks the user for: primary symptom, location, severity, duration, additional symptoms.  
   - Conversation is stateful: backend keeps intake_data (primary_symptom, location, severity, duration, additional_symptoms) and missing_fields per session (thread_id).  
   - Optional: user can upload a symptom image (URL sent to backend) and/or vitals (heart_rate, respiration from a video).  
   - Optional: user can be logged in (patient_id = Auth0 user.sub); backend then loads health profile from store if not sent in the request.

2. **Specialist phase (optional)**  
   - When intake is complete, a router (LLM or rule-based) may assign a specialist: dermatology, dental, or cardiology.  
   - A second AI agent (specialist) takes over for a limited number of turns (e.g. 2–3).  
   - Specialist has access to: conversation summary, intake_data, health_profile, and symptom image if provided.  
   - Frontend receives `assistant_question` and `agent_role` (e.g. "dermatology") so it can show who is talking.

3. **Triage and report**  
   - After intake (and specialist if any), backend runs triage (rule-based + optional RAG guidelines) and may escalate with vitals (e.g. high heart rate → higher urgency).  
   - A structured clinical report is built (template with sections) and an AI confidence score is computed.  
   - Response includes: triage (urgency, department, reason, priority_level, triage_message, confidence), report (full text), report_json (for storage/PDF/EHR).  
   - If patient_id is present, the visit is appended to patient memory for future “previous visits” context.

## Backend API (configurable BASE_URL)

- **GET /frontend-config** → `{ cloudinary_cloud_name, cloudinary_upload_preset, backend_base_url }`  
- **POST /assess**  
  - Body: `text`, optional `vitals` (heart_rate, respiration), optional `symptom_image_url`, optional `patient_id`, optional `locale`, optional `health_profile` (if not logged in or overriding).  
  - Response (intake not complete): `intake_data`, `assistant_question`, `specialist`, `agent_role`.  
  - Response (intake complete, triage): `intake_data`, `triage`, `report`, `report_json`, `session_id`, `specialist`, `agent_role`.  
- **POST /vitals/from-url** → Body `{ url }` → `{ heart_rate, respiration }` or `{ error }`.  
- **GET /profile/health?patient_id=...** → `{ health_profile }`.  
- **PUT /profile/health** → Body `{ patient_id, health_profile }` → `{ health_profile }`.  
- **POST /speak** (TTS), **POST /transcribe** (STT) for voice mode.

## Values being tracked (for UI, analytics, or further use)

**Per request/session (backend, keyed by thread_id / session_id):**  
- **intake_data:** primary_symptom, location, severity, duration, additional_symptoms.  
- **phase:** general | specialist | triage.  
- **specialist:** "" | dermatology | dental | cardiology.  
- **specialist_thread_id,** specialist_turns, specialist_notes (for report).  
- **last_question** (last AI message, for extraction context).

**Per response (sent to frontend):**  
- **intake_data** (current collected fields).  
- **assistant_question** (AI reply text).  
- **agent_role** (who is speaking: "intake" | "dermatology" | "dental" | "cardiology").  
- **specialist** (referred specialty, if any).  
- **triage:** urgency, department, reason, priority_level, triage_message, confidence.  
- **report** (full text), **report_json** (structured report + ai_confidence_score).  
- **session_id** (thread_id).

**Per user (when logged in, patient_id):**  
- **Health profile** (allergies, past_surgeries, last_surgery_date, chronic_conditions, medications, blood_type, family_history, other_relevant) — GET/PUT /profile/health.  
- **Previous visits** (used in prompts; backend appends after each triage).

**Frontend state (Intake page) that can be used for UI:**  
- **sessionStarted** (user clicked “Start”).  
- **messages** (chat history: user / assistant / system; each can have triage, agentRole).  
- **intakeData** (from last response).  
- **referredSpecialist** (from response specialist).  
- **triage** (urgency, department, reason, priority_level, triage_message, confidence).  
- **report**, **reportJson** (clinical report and JSON).  
- **vitals** (heart_rate, respiration) or null.  
- **symptomImageUrl** or null.  
- **config** (from /frontend-config).  
- **patientId** (from Auth0 when logged in).  
- **outputMode** (voice | text), **selectedVoiceId**, **isRecording**, **speakError**.  
- **vitalsDialogOpen**, **vitalsDialogStep** (choose | record), **isRecordingVitals**.  
- **mockMode** (fallback when config/API fails).

Use these values to drive the UI: stepper (Intake → With intake nurse → Transferred to [specialist] → Report finalized), chat bubbles with agent role, triage card, report panel, Copy JSON, vitals display, and any analytics or personalization you add.
```

---

Use section 1 to choose which file(s) to copy into Replit; use section 2 as the prompt to describe architecture and values to Replit (or another AI).
