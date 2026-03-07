# Using Presage from the Web

Presage SmartSpectra does **not** run in the browser (no JavaScript SDK). This project uses the **Presage Physiology API** (cloud) from the backend.

## Does it use Presage’s capabilities?

**Yes.** The backend calls Presage’s **Physiology API**: you upload a video, and Presage’s service analyzes it and returns **heart rate** and **respiration rate**. That *is* Presage’s core capability (vitals-from-video). It’s not a chat/AI assistant; it’s their computer-vision/signal-processing pipeline that extracts physiological signals from face/chest region in video.

## Flow

1. **Web app** records a short video (20–30 seconds) using the device camera.
2. **Frontend** uploads the video file to `POST /vitals`.
3. **Backend** sends the video to Presage’s cloud API and returns heart rate and respiration.

## Backend

- **Endpoint:** `POST /vitals`
- **Body:** `multipart/form-data` with a single file field named `video`.
- **Accepted formats:** MP4, AVI, MOV.
- **Response:** `{ "heart_rate": 72, "respiration": 16 }` or `{ "error": "..." }`.

Set `PRESAGE_API_KEY` in `.env`.

## Testing

**1. Start the backend** (from repo root, with `.env` and `PRESAGE_API_KEY` set):

```bash
cd backend && uvicorn main:app --reload
```

**2. Call `/vitals` with a video file.**

You need a short video (MP4/AVI/MOV, ~20–30 s, face visible). Record one on your phone or use a sample.

**With curl** (replace `your_video.mp4` and `http://localhost:8000` if needed):

```bash
curl -X POST http://localhost:8000/vitals -F "video=@your_video.mp4"
```

**With the Python test script** (see `backend/scripts/test_vitals_upload.py`):

```bash
cd backend
python scripts/test_vitals_upload.py path/to/video.mp4
```

The response will be JSON like `{"heart_rate": 72, "respiration": 16}` or `{"error": "..."}`.

## Frontend: record and upload

Use the browser’s MediaRecorder to capture from the camera, then upload the resulting blob:

```javascript
// 1. Get camera stream
const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });

// 2. Record for ~20–30 seconds (Presage recommends at least 20 s)
const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
const chunks = [];
recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
recorder.start(1000);

await new Promise((r) => setTimeout(r, 22000)); // record 22 s
recorder.stop();
stream.getTracks().forEach((t) => t.stop());

await new Promise((r) => (recorder.onstop = r));
const blob = new Blob(chunks, { type: recorder.mimeType });

// 3. If backend expects MP4, you may need to use a client-side converter (e.g. ffmpeg.wasm)
//    or use a backend that accepts WebM. For now, try uploading WebM; if the API rejects it,
//    convert to MP4 (e.g. via ffmpeg.wasm) or use a different recorder mimeType if supported.

const form = new FormData();
form.append('video', blob, 'recording.webm');

const res = await fetch('/vitals', { method: 'POST', body: form });
const vitals = await res.json();
console.log(vitals); // { heart_rate: 72, respiration: 16 }
```

**Note:** Presage expects **MP4, AVI, or MOV**. Many browsers record as **WebM**. If the API rejects WebM, either:

- Convert WebM → MP4 in the browser (e.g. with [ffmpeg.wasm](https://ffmpeg.org/)), or  
- Send the WebM to the backend and convert there (e.g. with `ffmpeg` or a Python library) before calling Presage.

## Presage video guidelines

- **Length:** At least ~20 seconds.
- **Framerate:** > 10 fps.
- **Subject:** Single person, face + shoulders + chest visible, looking at the camera, minimal movement.
- **Lighting:** Stable, not too dark or blown out.
