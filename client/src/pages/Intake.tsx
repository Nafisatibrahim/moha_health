import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
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
  FileJson,
  Volume2,
  FileText,
  Mic,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

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

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  triage?: TriageResult;
  timestamp: Date;
}

interface FrontendConfig {
  cloudinary_cloud_name: string;
  cloudinary_upload_preset: string;
  backend_base_url: string;
}

export interface HealthProfile {
  allergies: string;
  past_surgeries: string;
  last_surgery_date: string;
  chronic_conditions: string;
  medications: string;
  blood_type: string;
  family_history: string;
  other_relevant: string;
}

const OUTPUT_MODE_KEY = "intake_output_mode";
const HEALTH_PROFILE_KEY = "intake_health_profile";
type OutputMode = "voice" | "text";

const SILENCE_THRESHOLD = 0.008;
const SILENCE_DURATION_MS = 1800;
const MIN_SPEECH_MS = 500;
const SILENCE_CHECK_MS = 150;

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
  const [triage, setTriage] = useState<TriageResult | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastResponse, setLastResponse] = useState<unknown>(null);
  const [config, setConfig] = useState<FrontendConfig | null>(null);
  const [mockMode, setMockMode] = useState(false);
  const [mockQuestionIndex, setMockQuestionIndex] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [outputMode, setOutputMode] = useState<OutputMode>(() => {
    if (typeof window === "undefined") return "text";
    const saved = window.localStorage.getItem(OUTPUT_MODE_KEY);
    return saved === "voice" || saved === "text" ? saved : "text";
  });
  const [isRecording, setIsRecording] = useState(false);
  const [speakError, setSpeakError] = useState<string | null>(null);
  const emptyProfile: HealthProfile = {
    allergies: "",
    past_surgeries: "",
    last_surgery_date: "",
    chronic_conditions: "",
    medications: "",
    blood_type: "",
    family_history: "",
    other_relevant: "",
  };
  const [healthProfile, setHealthProfile] = useState<HealthProfile>(() => {
    if (typeof window === "undefined") return { ...emptyProfile };
    try {
      const raw = window.localStorage.getItem(HEALTH_PROFILE_KEY);
      if (!raw) return { ...emptyProfile };
      const parsed = JSON.parse(raw) as Partial<HealthProfile>;
      return { ...emptyProfile, ...parsed };
    } catch {
      return { ...emptyProfile };
    }
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
  const handleSendRef = useRef<(text?: string, onAfter?: (restart: boolean) => void) => Promise<void>>(null as unknown as (text?: string, onAfter?: (restart: boolean) => void) => Promise<void>);
  const startRecordingRef = useRef<() => void>(() => {});
  const outputModeRef = useRef<OutputMode>(outputMode);
  outputModeRef.current = outputMode;
  const silenceCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceStartRef = useRef<number | null>(null);
  const speechStartRef = useRef<number | null>(null);

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

  async function speak(text: string) {
    if (!text?.trim() || mockMode || outputMode !== "voice") return;
    setSpeakError(null);
    try {
      const res = await fetch(`${BASE_URL}/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        const errText = await res.text();
        let msg = `TTS error ${res.status}`;
        try {
          const j = JSON.parse(errText);
          if (j.detail) msg = String(j.detail);
        } catch {
          if (errText) msg = errText.slice(0, 120);
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
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => {
        URL.revokeObjectURL(url);
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

  // Speak welcome message once after user interaction (browsers block play() until then)
  useEffect(() => {
    if (outputMode !== "voice" || config === null || welcomeSpokenRef.current) return;

    const onFirstInteraction = () => {
      if (welcomeSpokenRef.current) return;
      welcomeSpokenRef.current = true;
      speak(t("intake.welcome"));
      document.removeEventListener("click", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
      document.removeEventListener("touchstart", onFirstInteraction);
      setTimeout(() => startRecordingRef.current(), 400);
    };

    document.addEventListener("click", onFirstInteraction, { once: true });
    document.addEventListener("keydown", onFirstInteraction, { once: true });
    document.addEventListener("touchstart", onFirstInteraction, { once: true });

    return () => {
      document.removeEventListener("click", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
      document.removeEventListener("touchstart", onFirstInteraction);
    };
  }, [outputMode, config, t]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(HEALTH_PROFILE_KEY, JSON.stringify(healthProfile));
    } catch {
      /* ignore */
    }
  }, [healthProfile]);

  const addMessage = useCallback(
    (role: ChatMessage["role"], content: string, triageData?: TriageResult) => {
      const msg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        role,
        content,
        triage: triageData,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
      return msg;
    },
    []
  );

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
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const res = await fetch(`${BASE_URL}/transcribe`, {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            addMessage("system", t("intake.transcriptionFailed", { detail: (err as { detail?: string }).detail || String(res.status) }));
            return;
          }
          const data = (await res.json()) as { text?: string };
          const transcribed = (data.text || "").trim();
          if (transcribed) {
            handleSendRef.current?.(transcribed, (shouldRestartRecording) => {
              if (shouldRestartRecording && outputModeRef.current === "voice")
                setTimeout(() => startRecordingRef.current(), 300);
            });
          } else {
            if (outputModeRef.current === "voice") setTimeout(() => startRecordingRef.current(), 300);
          }
        } catch {
          addMessage("system", t("intake.couldNotTranscribe"));
          if (outputModeRef.current === "voice") setTimeout(() => startRecordingRef.current(), 300);
        } finally {
          setIsRecording(false);
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
            silenceStartRef.current = null;
          } else {
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

  const handleSend = async (
    textOverride?: string,
    onAfterSend?: (shouldRestartRecording: boolean) => void
  ) => {
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
          setTriage(mockTriageResult);
          const triageMsg = t("intake.assessmentCompleteTriage");
          addMessage("assistant", triageMsg, mockTriageResult);
          speak(triageMsg);
        } else {
          const question = MOCK_QUESTIONS[mockQuestionIndex % MOCK_QUESTIONS.length];
          setMockQuestionIndex((i) => i + 1);
          const mockResponse = {
            intake_data: { primary_symptom: text },
            assistant_question: question,
          };
          setLastResponse(mockResponse);
          addMessage("assistant", question);
          speak(question);
        }
      } else {
        const res = await fetch(`${BASE_URL}/assess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, vitals, health_profile: healthProfile, locale: i18n.language }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setLastResponse(data);

        if (data.triage) {
          gotTriage = true;
          setTriage(data.triage);
          const triageMessage =
            data.assistant_question || t("intake.assessmentCompleteDefault");
          addMessage("assistant", triageMessage, data.triage);
          speak(triageMessage);
        } else if (data.assistant_question) {
          addMessage("assistant", data.assistant_question);
          speak(data.assistant_question);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      addMessage("system", t("intake.errorSomethingWrong", { message: errorMsg }));
      setMockMode(true);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
      onAfterSend?.(!gotTriage);
    }
  };

  handleSendRef.current = handleSend;
  startRecordingRef.current = startRecording;

  const handleVitalsUpload = () => {
    if (mockMode || !window.cloudinary || !config) {
      simulateMockVitals();
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: config.cloudinary_cloud_name,
        uploadPreset: config.cloudinary_upload_preset,
        resourceType: "auto",
        sources: ["local", "camera", "url"],
        multiple: false,
      },
      async (error: unknown, result: { event: string; info: { secure_url: string } }) => {
        if (error) {
          addMessage("system", t("intake.videoUploadFailed"));
          return;
        }
        if (result.event === "success") {
          const videoUrl = result.info.secure_url;
          setVitalsLoading(true);
          try {
            const res = await fetch(`${BASE_URL}/vitals/from-url`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ url: videoUrl }),
            });
            const data = await res.json();
            if (data.error) {
              addMessage("system", t("intake.vitalsError", { error: data.error }));
            } else if (data.heart_rate != null && data.respiration != null) {
              const v: Vitals = { heart_rate: data.heart_rate, respiration: data.respiration };
              setVitals(v);
              addMessage(
                "system",
                t("intake.vitalsDetected", { hr: v.heart_rate, rr: v.respiration })
              );
            }
          } catch {
            addMessage("system", t("intake.couldNotProcessVitals"));
            simulateMockVitals();
          } finally {
            setVitalsLoading(false);
          }
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

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gradient-to-br from-blue-50/50 via-white to-indigo-50/30">
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
                </div>
                {speakError && (
                  <p className="mt-2 text-xs text-destructive" role="alert">
                    {speakError}
                  </p>
                )}
              </CardHeader>

              <ScrollArea className="flex-1 p-4" data-testid="chat-messages-area">
                <div className="space-y-4 pb-4">
                  <AnimatePresence initial={false}>
                    {messages.map((msg) => (
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
                    disabled={isLoading || !!triage}
                    title={isRecording ? t("intake.stopRecording") : t("intake.recordVoiceMessage")}
                    aria-label={isRecording ? t("intake.stopRecording") : t("intake.recordVoiceMessage")}
                    data-testid="button-record-voice"
                  >
                    {isRecording ? (
                      <Square className="h-4 w-4" aria-hidden />
                    ) : (
                      <Mic className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={triage ? t("intake.assessmentComplete") : t("intake.placeholderDescribe")}
                    disabled={isLoading || !!triage}
                    className="flex-1"
                    data-testid="input-chat-message"
                  />
                  <Button
                    type="submit"
                    disabled={!inputValue.trim() || isLoading || !!triage}
                    data-testid="button-send-message"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="sr-only sm:not-sr-only sm:ml-1">{t("common.send")}</span>
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{t("intake.yourHealthProfile")}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    {t("intake.healthProfileDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("intake.allergies")}</Label>
                    <Input
                      placeholder={t("intake.allergiesPlaceholder")}
                      value={healthProfile.allergies}
                      onChange={(e) =>
                        setHealthProfile((p) => ({ ...p, allergies: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("intake.pastSurgeries")}</Label>
                    <Input
                      placeholder={t("intake.pastSurgeriesPlaceholder")}
                      value={healthProfile.past_surgeries}
                      onChange={(e) =>
                        setHealthProfile((p) => ({ ...p, past_surgeries: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("intake.lastSurgeryDate")}</Label>
                    <Input
                      placeholder={t("intake.lastSurgeryDatePlaceholder")}
                      value={healthProfile.last_surgery_date}
                      onChange={(e) =>
                        setHealthProfile((p) => ({ ...p, last_surgery_date: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("intake.chronicConditions")}</Label>
                    <Input
                      placeholder={t("intake.chronicConditionsPlaceholder")}
                      value={healthProfile.chronic_conditions}
                      onChange={(e) =>
                        setHealthProfile((p) => ({ ...p, chronic_conditions: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("intake.currentMedications")}</Label>
                    <Input
                      placeholder={t("intake.currentMedicationsPlaceholder")}
                      value={healthProfile.medications}
                      onChange={(e) =>
                        setHealthProfile((p) => ({ ...p, medications: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("intake.bloodType")}</Label>
                    <Input
                      placeholder={t("intake.bloodTypePlaceholder")}
                      value={healthProfile.blood_type}
                      onChange={(e) =>
                        setHealthProfile((p) => ({ ...p, blood_type: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("intake.familyHistory")}</Label>
                    <Input
                      placeholder={t("intake.familyHistoryPlaceholder")}
                      value={healthProfile.family_history}
                      onChange={(e) =>
                        setHealthProfile((p) => ({ ...p, family_history: e.target.value }))
                      }
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("intake.otherRelevant")}</Label>
                    <Textarea
                      placeholder={t("intake.otherRelevantPlaceholder")}
                      value={healthProfile.other_relevant}
                      onChange={(e) =>
                        setHealthProfile((p) => ({ ...p, other_relevant: e.target.value }))
                      }
                      className="min-h-[60px] text-sm resize-none"
                      rows={2}
                    />
                  </div>
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
                    {triage.triage_message && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="text-sm italic text-primary" data-testid="text-triage-message">
                          {translateTriageMessage(triage)}
                        </div>
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
