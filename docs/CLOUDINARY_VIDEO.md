# Cloudinary + Presage Vitals (Challenge Flow)

Use **Cloudinary** to store the video and the **React AI Starter Kit** for the frontend. The backend gets vitals from a **video URL** (no local file needed).

## Flow

1. **React app** (create-cloudinary-react): user records ~20–30 s with camera (getUserMedia + MediaRecorder).
2. **Upload to Cloudinary**: use Cloudinary’s upload API or widget to store the video → you get a **URL** (e.g. `https://res.cloudinary.com/<cloud>/video/upload/...`).
3. **Call backend with URL**: `POST /vitals/from-url` with body `{ "url": "<cloudinary_video_url>" }`.
4. **Backend** downloads the video from Cloudinary, sends it to Presage, returns `{ "heart_rate": 72, "respiration": 16 }`.

This gives you:
- **No local video file** – everything goes through Cloudinary.
- **Innovative use of Cloudinary for video** – store user-recorded vitals video, then process it via your API (Side Quest 2).
- **Production-ready** – video is stored, shareable, and you can display the same URL in the UI.

---

## Backend: POST /vitals/from-url

- **Method:** POST  
- **Content-Type:** application/json  
- **Body:** `{ "url": "https://res.cloudinary.com/.../video/upload/.../xyz.mp4" }`  
- **Response:** `{ "heart_rate": 72, "respiration": 16 }` or `{ "error": "..." }`

Example (replace with your backend and Cloudinary URL):

```bash
curl -X POST http://127.0.0.1:8000/vitals/from-url \
  -H "Content-Type: application/json" \
  -d '{"url":"https://res.cloudinary.com/demo/video/upload/sample.mp4"}'
```

---

## Frontend (React AI Starter Kit + Cloudinary)

1. **Scaffold with the starter kit:**
   ```bash
   npx create-cloudinary-react@latest my-health-app
   ```
   (Use the free-tier link from the challenge if provided.)

2. **Record video in the browser:**
   - Use `navigator.mediaDevices.getUserMedia({ video: true })` and `MediaRecorder` to capture ~20–30 s.
   - Get a `Blob` (e.g. WebM or MP4 if supported).

3. **Upload the blob to Cloudinary:**
   - Use Cloudinary’s **unsigned upload** (with upload preset) or **signed upload** from your backend.
   - Resource type: **video**.  
   - After upload you get a `secure_url` (e.g. `https://res.cloudinary.com/...`).

4. **Request vitals from your backend:**
   ```js
   const res = await fetch('http://localhost:8000/vitals/from-url', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ url: cloudinarySecureUrl }),
   });
   const vitals = await res.json();
   // { heart_rate: 72, respiration: 16 }
   ```

5. **Show the result** and optionally the Cloudinary video (e.g. `<video src={cloudinarySecureUrl} />`) for a polished, production-ready UX.

---

## Video format note

Presage expects **MP4, AVI, or MOV**. If the browser records **WebM**, you can:

- Use Cloudinary **transformation** to deliver the video as MP4 (e.g. `.../f_mp4/...` in the URL), and pass that transformed URL to `POST /vitals/from-url`, or  
- Convert WebM → MP4 before upload (e.g. ffmpeg.wasm in the browser), then upload MP4 to Cloudinary.

---

## Challenge alignment

- **Framework:** React AI Starter Kit (create-cloudinary-react).  
- **Innovative use of Cloudinary for video:** Store user-recorded vitals video on Cloudinary, then run a vitals pipeline (Presage) from that URL.  
- **Production-ready:** Upload → URL → vitals → display video + results.
