// app.js

const BASE_URL = "http://127.0.0.1:8000"; // Configurable Base URL
let cloudinaryConfig = null;
let lastVitals = null;
let lastAssessResponse = null;

// Initialize Lucide Icons
lucide.createIcons();

// DOM Elements
const chatArea = document.getElementById('chat-area');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const uploadBtn = document.getElementById('upload-btn');
const uploadContainer = document.getElementById('upload-container');
const vitalsResult = document.getElementById('vitals-result');
const debugToggle = document.getElementById('debug-toggle');
const debugContent = document.getElementById('debug-content');
const debugPre = document.getElementById('debug-pre');

// Debug Panel Toggle
debugToggle.addEventListener('click', () => {
  debugToggle.classList.toggle('open');
  debugContent.classList.toggle('hidden');
});

// Initialize
async function init() {
  try {
    const res = await fetch(`${BASE_URL}/frontend-config`);
    if (res.ok) {
      cloudinaryConfig = await res.json();
      console.log("Loaded frontend config");
    } else {
      console.warn("Could not load frontend-config from backend.");
    }
  } catch (err) {
    console.warn("Backend not reachable for frontend-config.", err);
  }
}

init();

// Helper: Auto-scroll
function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// Build User Message HTML
function addUserMessage(text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper user-wrapper';
  
  wrapper.innerHTML = `
    <div class="avatar user-avatar">ME</div>
    <div class="message user">${text}</div>
  `;
  
  chatArea.appendChild(wrapper);
  scrollToBottom();
}

// Build AI Message HTML
function addAiMessage(text) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ai-wrapper';
  
  wrapper.innerHTML = `
    <div class="avatar ai-avatar">AI</div>
    <div class="message ai">${text}</div>
  `;
  
  chatArea.appendChild(wrapper);
  scrollToBottom();
}

// Build Triage HTML
function addTriageBlock(triage) {
  const wrapper = document.createElement('div');
  wrapper.className = 'triage-wrapper';
  
  const urgencyClass = triage.urgency ? triage.urgency.toLowerCase() : 'low';
  
  let html = `
    <div class="triage-card ${urgencyClass}">
      <div class="triage-card-header">
        <i data-lucide="alert-circle" class="triage-icon"></i>
        <span class="urgency-badge">
          <span class="urgency-dot"></span>
          ${triage.urgency || 'Unknown'}
        </span>
      </div>
      <div class="triage-card-body">
  `;

  if (triage.department) {
    html += `
        <div class="triage-row">
          <span class="triage-label">Suggested Department</span>
          <span class="triage-value dept-value">${triage.department}</span>
        </div>
    `;
  }

  if (triage.reason) {
    html += `
        <div class="triage-row">
          <span class="triage-label">Reasoning</span>
          <span class="triage-value">${triage.reason}</span>
        </div>
    `;
  }

  if (triage.triage_message) {
    html += `
        <div class="triage-msg">${triage.triage_message}</div>
    `;
  }

  html += `
      </div>
    </div>
  `;
  
  wrapper.innerHTML = html;
  chatArea.appendChild(wrapper);
  
  // Re-init lucide icons for newly added elements
  lucide.createIcons();
  scrollToBottom();
}

// Loading Indicator
function addLoading() {
  const wrapper = document.createElement('div');
  wrapper.className = 'message-wrapper ai-wrapper loading-indicator-wrap';
  wrapper.id = 'loading-indicator';
  
  wrapper.innerHTML = `
    <div class="avatar ai-avatar">AI</div>
    <div class="message ai typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>
  `;
  
  chatArea.appendChild(wrapper);
  scrollToBottom();
}

function removeLoading() {
  const loading = document.getElementById('loading-indicator');
  if (loading) loading.remove();
}

// Update Debug
function updateDebug() {
  if (lastAssessResponse) {
    debugPre.textContent = JSON.stringify(lastAssessResponse, null, 2);
  }
}

// Send Message
async function sendMessage(text) {
  if (!text.trim()) return;

  addUserMessage(text);
  
  chatInput.value = '';
  chatInput.disabled = true;
  sendBtn.disabled = true;
  
  addLoading();

  try {
    const res = await fetch(`${BASE_URL}/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text,
        vitals: lastVitals
      })
    });
    
    removeLoading();
    
    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();
    lastAssessResponse = data;
    updateDebug();

    if (data.assistant_question) {
      addAiMessage(data.assistant_question);
    } else if (data.reply) {
      addAiMessage(data.reply); // Fallback if backend uses 'reply'
    }

    if (data.triage) {
      addTriageBlock(data.triage);
    }

  } catch (err) {
    removeLoading();
    addAiMessage(`Error connecting to system: ${err.message}`);
  } finally {
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// Chat Form Submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(chatInput.value);
});


// Cloudinary Upload Logic
uploadBtn.addEventListener('click', () => {
  if (!cloudinaryConfig || !cloudinaryConfig.cloudinary_cloud_name || !cloudinaryConfig.cloudinary_upload_preset) {
    alert("Cloudinary config not loaded. Is the backend running?");
    return;
  }

  const widget = cloudinary.createUploadWidget({
    cloudName: cloudinaryConfig.cloudinary_cloud_name,
    uploadPreset: cloudinaryConfig.cloudinary_upload_preset,
    sources: ['local', 'camera', 'url'],
    resourceType: 'video',
    multiple: false,
    theme: 'minimal'
  }, async (error, result) => {
    if (!error && result && result.event === "success") {
      const videoUrl = result.info.secure_url;
      
      // Update UI to show processing
      uploadContainer.style.display = 'none';
      vitalsResult.classList.remove('hidden');
      vitalsResult.innerHTML = `
        <div class="upload-box" style="padding: 20px;">
           <i data-lucide="loader-2" class="icon-indigo" style="animation: spin 2s linear infinite; width: 24px; height: 24px; margin-bottom: 8px;"></i>
           <p style="margin:0;">Analyzing vitals from video...</p>
        </div>
      `;
      lucide.createIcons();
      
      try {
        const res = await fetch(`${BASE_URL}/vitals/from-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: videoUrl })
        });
        
        const data = await res.json();
        
        if (data.error) {
          showVitalsError(data.error);
        } else if (data.heart_rate && data.respiration) {
          lastVitals = {
            heart_rate: data.heart_rate,
            respiration: data.respiration
          };
          
          showVitalsSuccess(data.heart_rate, data.respiration);
          
          // Auto-send context to chat
          setTimeout(() => {
             sendMessage(`I have uploaded my vitals video. Heart rate is ${data.heart_rate} bpm and respiration is ${data.respiration} rpm.`);
          }, 1000);
          
        } else {
           showVitalsError("Vitals not clearly detected.");
        }
      } catch (err) {
        showVitalsError(err.message);
      }
    }
  });

  widget.open();
});

function showVitalsSuccess(hr, resp) {
  vitalsResult.innerHTML = `
    <div class="vitals-success-banner">
      <i data-lucide="check-circle" style="width: 16px; height: 16px;"></i>
      Vitals successfully extracted
    </div>
    <div class="vitals-grid">
      <div class="vital-metric">
        <div class="vital-label">Heart Rate</div>
        <div class="vital-value">${hr} <span class="vital-unit">bpm</span></div>
      </div>
      <div class="vital-metric">
        <div class="vital-label">Respiration</div>
        <div class="vital-value">${resp} <span class="vital-unit">rpm</span></div>
      </div>
    </div>
    <button onclick="resetUpload()" class="btn-outline" style="width: 100%; margin-top: 16px;">Upload New Video</button>
  `;
  lucide.createIcons();
}

function showVitalsError(msg) {
  vitalsResult.innerHTML = `
    <div class="upload-box" style="padding: 20px; border-color: var(--danger-bg); background-color: var(--danger-bg);">
       <i data-lucide="alert-triangle" class="text-danger" style="margin-bottom: 8px;"></i>
       <p class="text-danger" style="margin:0; font-weight: 500;">Analysis Failed</p>
       <p style="font-size: 0.75rem; margin-top: 4px;" class="text-danger">${msg}</p>
       <button onclick="resetUpload()" class="btn-outline" style="margin-top: 12px;">Try Again</button>
    </div>
  `;
  lucide.createIcons();
}

window.resetUpload = function() {
  vitalsResult.classList.add('hidden');
  vitalsResult.innerHTML = '';
  uploadContainer.style.display = 'flex';
  lastVitals = null;
}
