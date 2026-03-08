import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useContext } from "react";
import { Auth0UserContext } from "@/lib/auth0-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Upload,
  Heart,
  Wind,
  AlertTriangle,
  Activity,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Loader2,
  Shield,
  Stethoscope,
  Video,
  Image as ImageIcon,
  X,
  FileJson,
  Volume2,
  FileText,
  Mic,
  Square,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        config: Record<string, unknown>,
        callback: (error: unknown, result: { event: string; info: { secure_url: string } }) => void
      ) => { open: () => void };
    };
  }
}

interface Vitals {
  heart_rate: number;
  respiration: number;
}

interface TriageResult {
  urgency: string;
  department: string;
  reason: string;
  priority_level: number;
  triage_message: string;
}

type AgentRole = "intake" | "dermatology" | "dental" | "cardiology" | "";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  triage?: TriageResult;
  agentRole?: AgentRole;
  timestamp: Date;
}

interface FrontendConfig {
  cloudinary_cloud_name: string;
  cloudinary_upload_preset: string;
  backend_base_url: string;
}

const OUTPUT_MODE_KEY = "intake_output_mode";
const VOICE_ID_KEY = "intake_voice_id";
type OutputMode = "voice" | "text";

// Custom voices from your ElevenLabs Voice Lab (add more when you create Dr. Elena, Daniel, Sophia)
const VOICE_OPTIONS: { id: string; label: string }[] = [
  { id: "T6dR36MoVxkns4oFuqPk", label: "Ava – Clinical Intake Nurse" },
  { id: "jp5oaxbrQWLoUSS7BbNR", label: "Dr. Marcus – Senior Physician" },
];

const SILENCE_THRESHOLD = 0.012;
const SILENCE_DURATION_MS = 1800;
const MIN_SPEECH_MS = 500;
const SILENCE_CHECK_MS = 150;
/** Only treat as "speech" (reset silence timer) after sound above threshold for this long — ignores clicks, typing, brief noise */
const SUSTAINED_SPEECH_MS = 280;

const MOCK_QUESTIONS = [
  "Can you describe the location of your symptoms more specifically?",
  "On a scale of 1-10, how would you rate the severity of your symptoms?",
  "How long have you been experiencing these symptoms?",
  "Have you taken any medication for this condition?",
  "Do you have any known allergies or pre-existing conditions?",
];

const MOCK_TRIAGE: TriageResult = {
  urgency: "MODERATE",
  department: "General Medicine",
  reason: "Patient reports moderate symptoms requiring clinical evaluation. Vitals within acceptable range.",
  priority_level: 3,
  triage_message: "Urgency level MODERATE. Please proceed to General Medicine for evaluation.",
};

function getUrgencyColor(urgency: string) {
  switch (urgency.toUpperCase()) {
    case "HIGH":
    case "CRITICAL":
      return "bg-red-100 text-red-800 border-red-300";
    case "MODERATE":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "LOW":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    default:
      return "bg-blue-100 text-blue-800 border-blue-300";
  }
}

export default function Intake() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const patientId = useContext(Auth0UserContext);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [vitals, setVitals] = useState<Vitals | null>(null);
  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsDialogOpen, setVitalsDialogOpen] = useState(false);
  const [vitalsDialogStep, setVitalsDialogStep] = useState<"choose" | "record">("choose");
  const [isRecordingVitals, setIsRecordingVitals] = useState(false);
  const vitalsVideoRef = useRef<HTMLVideoElement>(null);
  const vitalsStreamRef = useRef<MediaStream | null>(null);
  const vitalsRecorderRef = useRef<MediaRecorder | null>(null);
  const vitalsChunksRef = useRef<Blob[]>([]);
  const vitalsFileInputRef = useRef<HTMLInputElement>(null);
  const [symptomImageUrl, setSymptomImageUrl] = useState<string | null>(null);
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [reportJson, setReportJson] = useState<Record<string, unknown> | null>(null);
  const [reportOpen, setReportOpen] = useState(true);
  const [referredSpecialist, setReferredSpecialist] = useState<string>("");
  const [intakeData, setIntakeData] = useState<Record<string, string>>({});
  const [reportCopied, setReportCopied] = useState(false);
  const [reportJsonCopied, setReportJsonCopied] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  const [config, setConfig] = useState<FrontendConfig | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [mockQuestionIndex, setMockQuestionIndex] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [outputMode, setOutputMode] = useState<OutputMode>(() => {
    if (typeof window === "undefined") return "text";
    const saved = window.localStorage.getItem(OUTPUT_MODE_KEY);
    return saved === "voice" || saved === "text" ? saved : "text";
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(() => {
    if (typeof window === "undefined") return VOICE_OPTIONS[0].id;
    const saved = window.localStorage.getItem(VOICE_ID_KEY);
    if (saved && VOICE_OPTIONS.some((v) => v.id === saved)) return saved;
    return VOICE_OPTIONS[0].id;
  });

  function getPriorityLabel(level: number) {
    switch (level) {
      case 1:
        return t("triage.priorityImmediate");
      case 2:
        return t("triage.priorityUrgent");
      case 3:
        return t("triage.prioritySemiUrgent");
      case 4:
        return t("triage.priorityNonUrgent");
      default:
        return t("triage.priorityLevel", { level });
    }
  }

  function translateUrgency(urgency: string) {
    const u = urgency.toUpperCase();
    if (u === "HIGH" || u === "CRITICAL") return t("triage.urgencyHigh");
    if (u === "MODERATE") return t("triage.urgencyModerate");
    if (u === "LOW") return t("triage.urgencyLow");
    return urgency;
  }

  const DEPARTMENT_KEYS: Record<string, string> = {
    "Emergency Medicine": "triage.departmentEmergencyMedicine",
    "Emergency / Cardiology": "triage.departmentEmergencyCardiology",
    "Urgent Care": "triage.departmentUrgentCare",
    "Primary Care": "triage.departmentPrimaryCare",
    "General Medicine": "triage.departmentGeneralMedicine",
  };

  function translateDepartment(department: string) {
    const key = DEPARTMENT_KEYS[department];
    return key ? t(key) : department;
  }

  const REASON_KEYS: Record<string, string> = {
    "Symptoms appear mild based on available information.": "triage.reasonMild",
    "Chest pain may indicate a cardiac emergency.": "triage.reasonChestPain",
    "Severe abdominal pain may indicate appendicitis or other acute conditions.": "triage.reasonSevereAbdominal",
    "Breathing difficulty may indicate respiratory distress.": "triage.reasonBreathing",
    "Very severe pain reported.": "triage.reasonVerySevere",
    "Patient reports moderate symptoms requiring clinical evaluation. Vitals within acceptable range.": "triage.reasonMock",
    "Patient reports significant symptoms and has relevant surgical history; possible complication or recurrence — recommend evaluation.": "triage.reasonSurgeryHigh",
    "Moderate pain level reported.": "triage.reasonModerate",
    "Patient has relevant surgical/medical history; symptoms warrant evaluation.": "triage.reasonSurgeryMedium",
  };

  function translateReason(reason: string) {
    const key = REASON_KEYS[reason];
    return key ? t(key) : reason;
  }

  function translateTriageMessage(triageData: TriageResult) {
    const urgencyLabel = translateUrgency(triageData.urgency);
    const deptLabel = translateDepartment(triageData.department);
    return t("triage.triageMessage", { urgency: urgencyLabel, department: deptLabel });
  }

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const welcomeSpokenRef = useRef(false);
  const handleSendRef = useRef<(text?: string) => Promise<void>>(null as unknown as (text?: string) => Promise<void>);
  const startRecordingRef = useRef<() => void>(() => {});
  const outputModeRef = useRef<OutputMode>(outputMode);
  outputModeRef.current = outputMode;
  const silenceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentAudioUrlRef = useRef<string | null>(null);

  const DEFAULT_BASE_URL = "http://127.0.0.1:8000";
  const BASE_URL = config?.backend_base_url || DEFAULT_BASE_URL;

  function setOutputModeAndPersist(mode: OutputMode) {
    setOutputMode(mode);
    try {
      window.localStorage.setItem(OUTPUT_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
  }

  async function speak(text: string, onPlaybackEnd?: () => void) {
    if (!text?.trim() || mockMode || outputMode !== "voice") return;
    setSpeakError(null);
    // Stop any currently playing TTS so only one voice plays at a time
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (currentAudioUrlRef.current) {
      URL.revokeObjectURL(currentAudioUrlRef.current);
      currentAudioUrlRef.current = null;
    }
    try {
      const res = await fetch(`${BASE_URL}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice_id: selectedVoiceId || undefined }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errText = await res.text();
        let msg = `TTS error ${res.status}`;
        try {
          const j = JSON.parse(errText) as { detail?: string | { status?: string; message?: string } };
          const d = j.detail;
          if (typeof d === "string") {
            msg = d.toLowerCase().includes("quota") ? t("intake.ttsQuotaExceeded") : d;
          } else if (d && typeof d === "object") {
            const status = d.status ?? "";
            const message = d.message ?? "";
            if (status === "quota_exceeded" || String(message).toLowerCase().includes("quota")) {
              msg = t("intake.ttsQuotaExceeded");
            } else {
              msg = message || status || msg;
            }
          }
        } catch {
          if (errText && errText.toLowerCase().includes("quota")) msg = t("intake.ttsQuotaExceeded");
          else if (errText) msg = errText.slice(0, 120);
        }
        setSpeakError(msg);
        return;
      }
      if (!contentType.includes("audio") && !contentType.includes("octet-stream")) {
        const errText = await res.text();
        setSpeakError(errText ? `Unexpected response: ${errText.slice(0, 80)}` : "Server did not return audio.");
        return;
      }
      const blob = await res.blob();
      if (blob.size === 0) {
        setSpeakError("Empty audio received.");
        return;
      }
      const url = URL.createObjectURL(blob);
      currentAudioUrlRef.current = url;
      const audio = new Audio(url);
      currentAudioRef.current = audio;
      audio.onended = () => {
        currentAudioRef.current = null;
        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
          currentAudioUrlRef.current = null;
        }
        onPlaybackEnd?.();
      };
      audio.onerror = () => {
        currentAudioRef.current = null;
        if (currentAudioUrlRef.current) {
          URL.revokeObjectURL(currentAudioUrlRef.current);
          currentAudioUrlRef.current = null;
        }
        setSpeakError("Playback failed.");
      };
      await audio.play();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "TTS failed.";
      setSpeakError(msg);
    }
  }

  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch(`${DEFAULT_BASE_URL}/frontend-config`);
        if (!res.ok) throw new Error("Config not available");
        const data = await res.json();
        setConfig(data);
      } catch {
        setMockMode(true);
        setConfig({
          cloudinary_cloud_name: "demo",
          cloudinary_upload_preset: "demo",
          backend_base_url: DEFAULT_BASE_URL,
        });
      }
    }
    fetchConfig();
  }, []);

  // After user clicks "Click to start": show welcome, speak it once (if voice), start recording
  useEffect(() => {
    if (!sessionStarted || config === null || welcomeSpokenRef.current) return;
    welcomeSpokenRef.current = true;
    setMessages((prev) =>
      prev.map((m) => (m.id === "welcome" ? { ...m, content: t("intake.welcome") } : m))
    );
    if (outputMode === "voice") {
      speak(t("intake.welcome"), () => startRecordingRef.current());
    }
  }, [sessionStarted, config, outputMode, t]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = useCallback(
    (role: ChatMessage["role"], content: string, triageData?: TriageResult, agentRole?: AgentRole) => {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role,
        content,
        triage: triageData,
        agentRole: agentRole ?? undefined,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    []
  );

  function getAgentLabel(role: AgentRole | undefined): string {
    if (!role || role === "intake") return t("intake.agentIntakeNurse");
    if (role === "dermatology") return t("intake.agentDermatology");
    if (role === "dental") return t("intake.agentDental");
    if (role === "cardiology") return t("intake.agentCardiology");
    return role;
  }

  const startRecording = useCallback(async () => {
    setSpeakError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (silenceCheckRef.current) {
          clearInterval(silenceCheckRef.current);
          silenceCheckRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(() => {});
          audioContextRef.current = null;
        }
        silenceStartRef.current = null;
        speechStartRef.current = null;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (blob.size === 0) {
          setIsRecording(false);
          return;
        }
        setIsTranscribing(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const lang = (i18n.language || "en").split("-")[0];
          const url = `${BASE_URL}/transcribe${lang ? `?language_code=${encodeURIComponent(lang)}` : ""}`;
          const res = await fetch(url, {
            method: "POST",
            body: form,
            signal: controller.signal,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            addMessage("system", t("intake.transcriptionFailed", { detail: (err as { detail?: string }).detail || String(res.status) }));
            return;
          }
          const data = (await res.json()) as { text?: string };
          const transcribed = (data.text || "").trim();
          if (transcribed) {
            handleSendRef.current?.(transcribed);
          } else {
            if (outputModeRef.current === "voice") startRecordingRef.current();
          }
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            addMessage("system", t("intake.transcriptionTimeout"));
          } else {
            addMessage("system", t("intake.couldNotTranscribe"));
          }
          if (outputModeRef.current === "voice") startRecordingRef.current();
        } finally {
          clearTimeout(timeoutId);
          setIsRecording(false);
          setIsTranscribing(false);
        }
      };
      rec.start(200);
      mediaRecorderRef.current = rec;
      setIsRecording(true);

      // Silence detection: auto-stop when user stops talking
      try {
        const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.fftSize);

        silenceStartRef.current = null;
        speechStartRef.current = null;

        silenceCheckRef.current = setInterval(() => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") return;
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += Math.abs((dataArray[i] || 0) - 128);
          }
          const level = sum / dataArray.length / 128;
          const now = Date.now();

          if (level > SILENCE_THRESHOLD) {
            if (speechStartRef.current === null) speechStartRef.current = now;
            const sustainedMs = now - (speechStartRef.current ?? now);
            if (sustainedMs >= SUSTAINED_SPEECH_MS) silenceStartRef.current = null;
          } else {
            speechStartRef.current = null;
            const speechDuration = speechStartRef.current !== null ? now - speechStartRef.current : 0;
            if (speechDuration >= MIN_SPEECH_MS) {
              if (silenceStartRef.current === null) silenceStartRef.current = now;
              if (now - (silenceStartRef.current || now) >= SILENCE_DURATION_MS) {
                if (silenceCheckRef.current) {
                  clearInterval(silenceCheckRef.current);
                  silenceCheckRef.current = null;
                }
                mediaRecorderRef.current?.stop();
              }
            }
          }
        }, SILENCE_CHECK_MS);
      } catch {
        // Silence detection optional; user can still click stop
      }
    } catch {
      addMessage("system", "Microphone access denied or unavailable.");
    }
  }, [BASE_URL, addMessage]);

  const stopRecording = useCallback(() => {
    if (silenceCheckRef.current) {
      clearInterval(silenceCheckRef.current);
      silenceCheckRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    silenceStartRef.current = null;
    speechStartRef.current = null;
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? inputValue.trim()).trim();
    if (!text || isLoading) return;

    setInputValue("");
    addMessage("user", text);
    setIsLoading(true);
    const currentCount = messageCount + 1;
    setMessageCount(currentCount);
    let gotTriage = false;

    try {
      if (mockMode) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

        if (currentCount >= 4) {
          gotTriage = true;
          const mockTriageResult = {
            ...MOCK_TRIAGE,
            urgency: vitals && (vitals.heart_rate > 110 || vitals.respiration > 24) ? "HIGH" : "MODERATE",
            department:
              vitals && (vitals.heart_rate > 110 || vitals.respiration > 24)
                ? "Emergency Medicine"
                : "General Medicine",
            priority_level: vitals && (vitals.heart_rate > 110 || vitals.respiration > 24) ? 1 : 3,
            reason: vitals
              ? `Patient symptoms assessed with vitals (HR: ${vitals.heart_rate}, RR: ${vitals.respiration}). ${
                  vitals.heart_rate > 110 || vitals.respiration > 24
                    ? "Elevated vitals detected — escalating urgency."
                    : "Vitals within normal range."
                }`
              : MOCK_TRIAGE.reason,
            triage_message:
              vitals && (vitals.heart_rate > 110 || vitals.respiration > 24)
                ? "Urgency level HIGH. Please proceed to Emergency Medicine immediately."
                : MOCK_TRIAGE.triage_message,
          };

          const mockResponse = {
            intake_data: { primary_symptom: text, severity: 6 },
            triage: mockTriageResult,
          };
          setLastResponse(mockResponse);
          setIntakeData(mockResponse.intake_data as Record<string, string>);
          setTriage(mockTriageResult);
          const triageMsg = t("intake.assessmentCompleteTriage");
          addMessage("assistant", triageMsg, mockTriageResult, "intake");
          const startAfterPlayback = () => { if (outputMode === "voice") startRecordingRef.current(); };
          speak(triageMsg, startAfterPlayback);
        } else {
          const question = MOCK_QUESTIONS[mockQuestionIndex % MOCK_QUESTIONS.length];
          setMockQuestionIndex((i) => i + 1);
          const mockResponse = {
            intake_data: { primary_symptom: text },
            assistant_question: question,
          };
          setLastResponse(mockResponse);
          setIntakeData(mockResponse.intake_data as Record<string, string>);
          addMessage("assistant", question, undefined, "intake");
          const startAfterPlayback = () => { if (outputMode === "voice") startRecordingRef.current(); };
          speak(question, startAfterPlayback);
        }
      } else {
        const res = await fetch(`${BASE_URL}/assess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            vitals,
            locale: i18n.language,
            symptom_image_url: symptomImageUrl || undefined,
            ...(patientId ? { patient_id: patientId } : {}),
          }),
        });

        if (!res.ok) {
          let detail = `Server error: ${res.status}`;
          try {
            const errBody = await res.json() as { detail?: string };
            if (errBody?.detail) detail = String(errBody.detail);
          } catch {
            /* ignore */
          }
          const msg = t("intake.errorSomethingWrong", { message: detail });
          toast({ title: t("common.error"), description: detail, variant: "destructive" });
          addMessage("system", msg);
          setMockMode(true);
          if (outputMode === "voice") startRecordingRef.current();
          return;
        }
        const data = await res.json();
        setLastResponse(data);
        const specialist = (data.specialist as string) || "";
        if (specialist) setReferredSpecialist(specialist);
        if (data.intake_data && typeof data.intake_data === "object") setIntakeData(data.intake_data as Record<string, string>);
        const agentRole = (data.agent_role as AgentRole) || "intake";

        if (data.triage) {
          gotTriage = true;
          setTriage(data.triage);
          setReport(typeof data.report === "string" ? data.report : null);
          setReportJson(data.report_json && typeof data.report_json === "object" ? data.report_json as Record<string, unknown> : null);
          if (typeof data.report === "string" && data.report.trim()) setReportOpen(true);
          const triageMessage =
            data.assistant_question || t("intake.assessmentCompleteDefault");
          addMessage("assistant", triageMessage, data.triage, agentRole);
          const startAfterPlayback = () => { if (outputMode === "voice") startRecordingRef.current(); };
          speak(triageMessage, startAfterPlayback);
        } else if (data.assistant_question) {
          addMessage("assistant", data.assistant_question, undefined, agentRole);
          const startAfterPlayback = () => { if (outputMode === "voice") startRecordingRef.current(); };
          speak(data.assistant_question, startAfterPlayback);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: t("common.error"), description: errorMsg, variant: "destructive" });
      addMessage("system", t("intake.errorSomethingWrong", { message: errorMsg }));
      setMockMode(true);
      if (outputMode === "voice") startRecordingRef.current();
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  handleSendRef.current = handleSend;
  startRecordingRef.current = startRecording;

  async function uploadVitalsVideoToCloudinary(fileOrBlob: File | Blob): Promise<string> {
    if (!config) throw new Error("No config");
    const form = new FormData();
    form.append("file", fileOrBlob);
    form.append("upload_preset", config.cloudinary_upload_preset);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudinary_cloud_name}/video/upload`,
      { method: "POST", body: form }
    );
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as { secure_url?: string };
    if (!data?.secure_url) throw new Error("No URL");
    return data.secure_url;
  }

  async function processVitalsFromUrl(videoUrl: string) {
    setVitalsLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/vitals/from-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      const data = await res.json();
      if (data.error || data.heart_rate == null || data.respiration == null) {
        addMessage("system", t("intake.vitalsError", { error: data.error || "No vitals" }));
        simulateMockVitals();
      } else {
        const v: Vitals = { heart_rate: data.heart_rate, respiration: data.respiration };
        setVitals(v);
        addMessage("system", t("intake.vitalsDetected", { hr: v.heart_rate, rr: v.respiration }));
      }
    } catch {
      addMessage("system", t("intake.couldNotProcessVitals"));
      simulateMockVitals();
    } finally {
      setVitalsLoading(false);
    }
  }

  const handleVitalsUpload = () => {
    if (mockMode || !config) {
      simulateMockVitals();
      return;
    }
    setVitalsDialogStep("choose");
    setVitalsDialogOpen(true);
  };

  const handleVitalsRecordWithCamera = async () => {
    setVitalsDialogStep("record");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      vitalsStreamRef.current = stream;
      if (vitalsVideoRef.current) vitalsVideoRef.current.srcObject = stream;
    } catch {
      addMessage("system", t("intake.videoUploadFailed"));
      setVitalsDialogOpen(false);
    }
  };

  const handleVitalsStartRecording = () => {
    const stream = vitalsStreamRef.current;
    if (!stream) return;
    vitalsChunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    vitalsRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size) vitalsChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(vitalsChunksRef.current, { type: "video/webm" });
      setVitalsDialogOpen(false);
      stopVitalsStream();
      try {
        const url = await uploadVitalsVideoToCloudinary(blob);
        await processVitalsFromUrl(url);
      } catch {
        addMessage("system", t("intake.videoUploadFailed"));
        simulateMockVitals();
      }
    };
    recorder.start(1000);
    setIsRecordingVitals(true);
  };

  const handleVitalsStopRecording = () => {
    const rec = vitalsRecorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    setIsRecordingVitals(false);
  };

  function stopVitalsStream() {
    vitalsStreamRef.current?.getTracks().forEach((t) => t.stop());
    vitalsStreamRef.current = null;
    if (vitalsVideoRef.current) vitalsVideoRef.current.srcObject = null;
  }

  const handleVitalsFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("video/")) return;
    setVitalsDialogOpen(false);
    try {
      const url = await uploadVitalsVideoToCloudinary(file);
      await processVitalsFromUrl(url);
    } catch {
      addMessage("system", t("intake.videoUploadFailed"));
      simulateMockVitals();
    }
  };

  const handleSymptomImageUpload = () => {
    if (mockMode || !window.cloudinary || !config) {
      setSymptomImageUrl("https://via.placeholder.com/400x300?text=Symptom+image");
      return;
    }
    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: config.cloudinary_cloud_name,
        uploadPreset: config.cloudinary_upload_preset,
        resourceType: "image",
        sources: ["local", "camera", "url"],
        multiple: false,
      },
      (error: unknown, result: { event: string; info: { secure_url: string } }) => {
        if (error) {
          addMessage("system", t("intake.imageUploadFailed"));
          return;
        }
        if (result.event === "success") {
          setSymptomImageUrl(result.info.secure_url);
          addMessage("system", t("intake.symptomImageAdded"));
        }
      }
    );
    widget.open();
  };

  const simulateMockVitals = async () => {
    setVitalsLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
    const mockV: Vitals = {
      heart_rate: 68 + Math.floor(Math.random() * 30),
      respiration: 14 + Math.floor(Math.random() * 8),
    };
    setVitals(mockV);
    setVitalsLoading(false);
    addMessage(
      "system",
      t("intake.vitalsDetectedMock", { hr: mockV.heart_rate, rr: mockV.respiration })
    );
  };

  const onVitalsDialogOpenChange = (open: boolean) => {
    if (!open) {
      stopVitalsStream();
      setVitalsDialogStep("choose");
      setIsRecordingVitals(false);
    }
    setVitalsDialogOpen(open);
  };

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
      <input
        ref={vitalsFileInputRef}
        type="file"
        accept="video/*"
        onChange={handleVitalsFileSelected}
        className="hidden"
        aria-hidden
      />
      <Dialog open={vitalsDialogOpen} onOpenChange={onVitalsDialogOpenChange}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => vitalsLoading && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("intake.vitalsFromVideo")}</DialogTitle>
            <DialogDescription>{t("intake.vitalsFromVideoDesc")}</DialogDescription>
          </DialogHeader>
          {vitalsDialogStep === "choose" ? (
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                onClick={handleVitalsRecordWithCamera}
                variant="outline"
                className="w-full sm:w-auto"
                data-testid="vitals-record-camera"
              >
                <Video className="mr-2 h-4 w-4" />
                {t("intake.recordWithCamera")}
              </Button>
              <Button
                onClick={() => vitalsFileInputRef.current?.click()}
                variant="outline"
                className="w-full sm:w-auto"
                data-testid="vitals-upload-file"
              >
                <Upload className="mr-2 h-4 w-4" />
                {t("intake.uploadVideoFile")}
              </Button>
            </DialogFooter>
          ) : (
            <div className="space-y-4">
              <video
                ref={vitalsVideoRef}
                autoPlay
                muted
                playsInline
                className="w-full rounded-lg border bg-black aspect-video object-cover"
              />
              <DialogFooter>
                {!isRecordingVitals ? (
                  <Button onClick={handleVitalsStartRecording} data-testid="vitals-start-record">
                    {t("intake.startRecordingVitals")}
                  </Button>
                ) : (
                  <Button onClick={handleVitalsStopRecording} variant="destructive" data-testid="vitals-stop-record">
                    {t("intake.stopAndUseVideo")}
                  </Button>
                )}
                <Button variant="ghost" onClick={() => onVitalsDialogOpenChange(false)}>
                  {t("common.back")}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <div className="container mx-auto px-4 py-6 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
                {t("intake.title")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("intake.subtitle")}
              </p>
            </div>
          </div>
          {mockMode && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700" data-testid="badge-mock-mode">
              <Shield className="mr-1 h-3 w-3" />
              {t("intake.demoMode")}
            </Badge>
          )}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="flex h-[calc(100vh-280px)] min-h-[500px] flex-col overflow-hidden">
              <CardHeader className="border-b bg-muted/30 py-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{t("intake.intakeChat")}</CardTitle>
                </div>
                <CardDescription className="mb-3">
                  {t("intake.intakeChatDesc")}
                </CardDescription>
                <p className="mb-3 text-xs text-muted-foreground" title={t("intake.weAskUntil")}>
                  {t("intake.weAskUntil")}
                </p>
                <div
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2"
                  role="group"
                  aria-label={t("intake.receiveResponses")}
                >
                  <Label className="text-sm font-medium text-muted-foreground">
                    {t("intake.receiveResponses")}
                  </Label>
                  <RadioGroup
                    value={outputMode}
                    onValueChange={(v) => setOutputModeAndPersist(v as OutputMode)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="text" id="output-text" />
                      <Label
                        htmlFor="output-text"
                        className="flex cursor-pointer items-center gap-1.5 text-sm font-normal"
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                        {t("intake.textOnly")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="voice" id="output-voice" />
                      <Label
                        htmlFor="output-voice"
                        className="flex cursor-pointer items-center gap-1.5 text-sm font-normal"
                      >
                        <Volume2 className="h-4 w-4" aria-hidden />
                        {t("intake.voiceReadAloud")}
                      </Label>
                    </div>
                  </RadioGroup>
                  {outputMode === "voice" && (
                    <Select
                      value={selectedVoiceId}
                      onValueChange={(id) => {
                        setSelectedVoiceId(id);
                        try {
                          window.localStorage.setItem(VOICE_ID_KEY, id);
                        } catch {
                          /* ignore */
                        }
                      }}
                    >
                      <SelectTrigger className="w-[220px] h-8 text-xs" aria-label="Agent voice">
                        <SelectValue placeholder="Voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICE_OPTIONS.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                {speakError && (
                  <p className="mt-2 text-xs text-destructive" role="alert">
                    {speakError}
                  </p>
                )}
              </CardHeader>

              {sessionStarted && (
                <div className="border-b bg-muted/20 px-4 py-2" aria-label={t("intake.stepIntake")}>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs">
                    <span className={!intakeData.primary_symptom ? "font-semibold text-primary" : "text-muted-foreground"}>
                      {intakeData.primary_symptom ? "\u2713 " : ""}
                      {t("intake.stepIntake")}
                    </span>
                    <span className="text-muted-foreground/70">→</span>
                    <span className={intakeData.primary_symptom && !referredSpecialist ? "font-semibold text-primary" : referredSpecialist ? "text-muted-foreground" : "text-muted-foreground/70"}>
                      {referredSpecialist ? "\u2713 " : ""}
                      {t("intake.stepWithIntake")}
                    </span>
                    <span className="text-muted-foreground/70">→</span>
                    <span className={referredSpecialist && !triage ? "font-semibold text-primary" : triage ? "text-muted-foreground" : "text-muted-foreground/70"}>
                      {triage ? "\u2713 " : ""}
                      {referredSpecialist ? `${t("intake.stepTransferredTo")} ${referredSpecialist.charAt(0).toUpperCase() + referredSpecialist.slice(1)}` : "—"}
                    </span>
                    <span className="text-muted-foreground/70">→</span>
                    <span className={triage ? "font-semibold text-primary" : "text-muted-foreground/70"}>
                      {triage ? "\u2713 " : ""}
                      {t("intake.stepReportFinalized")}
                    </span>
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 p-4" data-testid="chat-messages-area">
                <div className="space-y-4 pb-4">
                  {!sessionStarted && (
                    <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 py-8">
                      <p className="text-center text-sm text-muted-foreground">
                        {t("intake.intakeChatDesc")}
                      </p>
                      <Button
                        size="lg"
                        className="min-w-[200px]"
                        onClick={() => setSessionStarted(true)}
                        data-testid="button-click-to-start"
                      >
                        {t("intake.clickToStart")}
                      </Button>
                    </div>
                  )}
                  <AnimatePresence initial={false}>
                    {sessionStarted && messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                        data-testid={`chat-message-${msg.id}`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            msg.role === "user"
                              ? "bg-primary text-white"
                              : msg.role === "system"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {msg.role === "user" ? (
                            <User className="h-4 w-4" />
                          ) : msg.role === "system" ? (
                            <Activity className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </div>

                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                            msg.role === "user"
                              ? "bg-primary text-white"
                              : msg.role === "system"
                                ? "border border-amber-200 bg-amber-50 text-amber-900"
                                : "border bg-white text-foreground shadow-sm"
                          }`}
                        >
                          {msg.role === "assistant" && (
                            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Bot className="h-3.5 w-3.5" />
                              <span>{getAgentLabel(msg.agentRole)}</span>
                            </div>
                          )}
                          <p className="text-sm leading-relaxed">
                            {msg.id === "welcome" ? t("intake.welcome") : msg.content}
                          </p>

                          {msg.triage && (
                            <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm font-semibold">{t("intake.triageResult")}</span>
                                <Badge
                                  className={`ml-auto ${getUrgencyColor(msg.triage.urgency)}`}
                                  data-testid="badge-urgency-inline"
                                >
                                  {translateUrgency(msg.triage.urgency)}
                                </Badge>
                              </div>
                              <div className="grid gap-2 text-sm">
                                <div>
                                  <span className="font-medium">{t("intake.department")}:</span> {translateDepartment(msg.triage.department)}
                                </div>
                                <div>
                                  <span className="font-medium">{t("intake.priority")}:</span>{" "}
                                  {getPriorityLabel(msg.triage.priority_level)} ({t("triage.priorityLevel", { level: msg.triage.priority_level })})
                                </div>
                                <div>
                                  <span className="font-medium">{t("intake.reason")}:</span> {translateReason(msg.triage.reason)}
                                </div>
                                {msg.triage.triage_message && (
                                  <div className="mt-1 rounded-lg bg-white/60 p-2 text-xs italic">
                                    {translateTriageMessage(msg.triage)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-3"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="flex items-center gap-2 rounded-2xl border bg-white px-4 py-3 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">{t("common.loading")}</span>
                      </div>
                    </motion.div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="border-t bg-white p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <Button
                    type="button"
                    variant={isRecording ? "destructive" : "outline"}
                    size="icon"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={!sessionStarted || isLoading || !!triage || isTranscribing}
                    title={isTranscribing ? t("intake.transcribing") : isRecording ? t("intake.stopRecording") : t("intake.recordVoiceMessage")}
                    aria-label={isTranscribing ? t("intake.transcribing") : isRecording ? t("intake.stopRecording") : t("intake.recordVoiceMessage")}
                    data-testid="button-record-voice"
                  >
                    {isTranscribing ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : isRecording ? (
                      <Square className="h-4 w-4" aria-hidden />
                    ) : (
                      <Mic className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {isTranscribing && (
                      <p className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        {t("intake.transcribing")}
                      </p>
                    )}
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={triage ? t("intake.assessmentComplete") : t("intake.placeholderDescribe")}
                      disabled={!sessionStarted || isLoading || !!triage || isTranscribing}
                      className="flex-1"
                      data-testid="input-chat-message"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={!sessionStarted || !inputValue.trim() || isLoading || !!triage}
                    data-testid="button-send-message"
                    aria-label={isLoading ? t("common.loading") : t("common.send")}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                    <span className="sr-only sm:not-sr-only sm:ml-1">{t("common.send")}</span>
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t("intake.yourInformation")}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {t("intake.yourInformationDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {intakeData.primary_symptom ? (
                    <>
                      <div className="rounded bg-muted/50 px-2 py-1.5">
                        <span className="text-xs font-medium text-muted-foreground">{t("intake.primarySymptom")}:</span>
                        <p className="text-sm">{intakeData.primary_symptom}</p>
                      </div>
                      {intakeData.location && (
                        <div className="rounded bg-muted/50 px-2 py-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{t("intake.location")}:</span>
                          <p className="text-sm">{intakeData.location}</p>
                        </div>
                      )}
                      {intakeData.severity && (
                        <div className="rounded bg-muted/50 px-2 py-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{t("intake.severity")}:</span>
                          <p className="text-sm">{intakeData.severity}</p>
                        </div>
                      )}
                      {intakeData.duration && (
                        <div className="rounded bg-muted/50 px-2 py-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{t("intake.duration")}:</span>
                          <p className="text-sm">{intakeData.duration}</p>
                        </div>
                      )}
                      {intakeData.additional_symptoms && (
                        <div className="rounded bg-muted/50 px-2 py-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{t("intake.additionalSymptoms")}:</span>
                          <p className="text-sm">{intakeData.additional_symptoms}</p>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("intake.noInformationYet")}</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t("intake.symptomImage")}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {t("intake.symptomImageDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleSymptomImageUpload}
                    variant="outline"
                    className="w-full"
                    disabled={!!triage}
                    data-testid="button-upload-symptom-image"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {t("intake.uploadSymptomImage")}
                  </Button>
                  {symptomImageUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative rounded-lg border bg-muted/30 overflow-hidden"
                    >
                      <img
                        src={symptomImageUrl}
                        alt={t("intake.symptomImageAlt")}
                        className="h-32 w-full object-cover"
                      />
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => setSymptomImageUrl(null)}
                        aria-label={t("intake.removeImage")}
                        data-testid="button-remove-symptom-image"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <p className="p-2 text-xs text-muted-foreground">{t("intake.symptomImageSent")}</p>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t("intake.vitalsFromVideo")}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {t("intake.vitalsFromVideoDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    onClick={handleVitalsUpload}
                    variant="outline"
                    className="w-full"
                    disabled={vitalsLoading}
                    data-testid="button-upload-vitals"
                  >
                    {vitalsLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("intake.processing")}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {t("intake.uploadVitalsVideo")}
                      </>
                    )}
                  </Button>

                  {vitals && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="grid grid-cols-2 gap-3"
                    >
                      <div
                        className="rounded-lg border bg-red-50 p-3 text-center"
                        data-testid="display-heart-rate"
                      >
                        <Heart className="mx-auto mb-1 h-5 w-5 text-red-500" />
                        <div className="text-2xl font-bold text-red-700">{vitals.heart_rate}</div>
                        <div className="text-xs text-red-600">bpm</div>
                      </div>
                      <div
                        className="rounded-lg border bg-blue-50 p-3 text-center"
                        data-testid="display-respiration"
                      >
                        <Wind className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                        <div className="text-2xl font-bold text-blue-700">{vitals.respiration}</div>
                        <div className="text-xs text-blue-600">breaths/min</div>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {triage && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card className="border-2 border-primary/20 shadow-lg" data-testid="card-triage-result">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{t("intake.triageResult")}</CardTitle>
                      </div>
                      <Badge className={getUrgencyColor(triage.urgency)} data-testid="badge-urgency">
                        {translateUrgency(triage.urgency)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {referredSpecialist && (
                      <div className="rounded-lg border-2 border-primary/30 bg-primary/10 p-3">
                        <div className="text-xs font-medium text-muted-foreground">{t("intake.referredTo")}</div>
                        <div className="text-sm font-bold capitalize" data-testid="text-specialist">
                          {referredSpecialist}
                        </div>
                      </div>
                    )}
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground">{t("intake.department")}</div>
                      <div className="text-sm font-semibold" data-testid="text-department">
                        {translateDepartment(triage.department)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground">{t("intake.priority")}</div>
                      <div className="text-sm font-semibold" data-testid="text-priority">
                        {getPriorityLabel(triage.priority_level)} ({t("triage.priorityLevel", { level: triage.priority_level })})
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground">{t("intake.reason")}</div>
                      <div className="text-sm" data-testid="text-reason">
                        {translateReason(triage.reason)}
                      </div>
                    </div>
                    {"confidence" in triage && typeof (triage as { confidence?: number }).confidence === "number" && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="text-xs font-medium text-muted-foreground">{t("intake.aiConfidence")}</div>
                        <div className="text-sm font-semibold" data-testid="text-confidence">
                          {(triage as { confidence: number }).confidence}
                        </div>
                      </div>
                    )}
                    {triage.triage_message && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="text-sm italic text-primary" data-testid="text-triage-message">
                          {translateTriageMessage(triage)}
                        </div>
                      </div>
                    )}
                    {report && (
                      <div className="rounded-lg border border-muted bg-muted/30">
                        <button
                          type="button"
                          onClick={() => setReportOpen((o) => !o)}
                          className="flex w-full items-center justify-between p-3 text-left text-sm font-medium"
                          data-testid="button-toggle-report"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {t("intake.summaryForDoctor")}
                          </span>
                          {reportOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        {reportOpen && (
                          <div className="border-t border-muted px-3 pb-3 pt-2">
                            <pre className="whitespace-pre-wrap rounded bg-background p-3 text-xs font-sans text-muted-foreground" data-testid="text-doctor-report">
                              {report}
                            </pre>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-testid="button-copy-report"
                                aria-label={reportCopied ? t("intake.reportCopied") : t("intake.copyReport")}
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(report);
                                    setReportCopied(true);
                                    setTimeout(() => setReportCopied(false), 2000);
                                  } catch {
                                    setSpeakError(t("intake.copyReportFailed"));
                                  }
                                }}
                              >
                                {reportCopied ? t("intake.reportCopied") : t("intake.copyReport")}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                data-testid="button-download-report"
                                aria-label={t("intake.downloadReport")}
                                onClick={() => {
                                  const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `moha-health-report-${new Date().toISOString().slice(0, 10)}.txt`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}
                              >
                                <Download className="mr-1 h-3.5 w-3.5" />
                                {t("intake.downloadReport")}
                              </Button>
                              {reportJson && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  data-testid="button-copy-report-json"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(JSON.stringify(reportJson, null, 2));
                                      setReportJsonCopied(true);
                                      setTimeout(() => setReportJsonCopied(false), 2000);
                                    } catch {
                                      setSpeakError(t("intake.copyReportFailed"));
                                    }
                                  }}
                                >
                                  {reportJsonCopied ? t("intake.reportCopied") : t("intake.copyReportJson")}
                                </Button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <Card>
                <CardHeader className="pb-0">
                  <button
                    onClick={() => setDebugOpen(!debugOpen)}
                    className="flex w-full items-center justify-between text-left"
                    data-testid="button-toggle-debug"
                  >
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">{t("intake.debugLastResponse")}</span>
                    </div>
                    {debugOpen ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CardHeader>
                <AnimatePresence>
                  {debugOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CardContent className="pt-3">
                        <pre
                          className="max-h-64 overflow-auto rounded-lg bg-muted p-3 text-xs leading-relaxed"
                          data-testid="text-debug-json"
                        >
                          {lastResponse ? JSON.stringify(lastResponse, null, 2) : t("intake.noResponseYet")}
                        </pre>
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
