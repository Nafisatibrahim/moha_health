import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

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

function getPriorityLabel(level: number) {
  switch (level) {
    case 1:
      return "Immediate";
    case 2:
      return "Urgent";
    case 3:
      return "Semi-Urgent";
    case 4:
      return "Non-Urgent";
    default:
      return `Level ${level}`;
  }
}

export default function Intake() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Welcome to the AI Hospital Intake Assistant. Please describe your symptoms and I'll help assess your situation. You can also upload a vitals video for a more comprehensive evaluation.",
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

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_BASE_URL = "http://127.0.0.1:8000";
  const BASE_URL = config?.backend_base_url || DEFAULT_BASE_URL;

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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setInputValue("");
    addMessage("user", text);
    setIsLoading(true);
    const currentCount = messageCount + 1;
    setMessageCount(currentCount);

    try {
      if (mockMode) {
        await new Promise((r) => setTimeout(r, 800 + Math.random() * 700));

        if (currentCount >= 4) {
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
          addMessage(
            "assistant",
            "Assessment complete. Based on the information you've provided, here is your triage result:",
            mockTriageResult
          );
        } else {
          const question = MOCK_QUESTIONS[mockQuestionIndex % MOCK_QUESTIONS.length];
          setMockQuestionIndex((i) => i + 1);
          const mockResponse = {
            intake_data: { primary_symptom: text },
            assistant_question: question,
          };
          setLastResponse(mockResponse);
          addMessage("assistant", question);
        }
      } else {
        const res = await fetch(`${BASE_URL}/assess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, vitals }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        const data = await res.json();
        setLastResponse(data);

        if (data.triage) {
          setTriage(data.triage);
          addMessage(
            "assistant",
            data.assistant_question || "Assessment complete. Here is your triage result:",
            data.triage
          );
        } else if (data.assistant_question) {
          addMessage("assistant", data.assistant_question);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Something went wrong";
      addMessage("system", `Error: ${errorMsg}. Switching to mock mode.`);
      setMockMode(true);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

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
          addMessage("system", "Video upload failed. Please try again.");
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
              addMessage("system", `Vitals extraction error: ${data.error}`);
            } else if (data.heart_rate != null && data.respiration != null) {
              const v: Vitals = { heart_rate: data.heart_rate, respiration: data.respiration };
              setVitals(v);
              addMessage(
                "system",
                `Vitals detected — Heart Rate: ${v.heart_rate} bpm, Respiration: ${v.respiration} breaths/min`
              );
            }
          } catch {
            addMessage("system", "Could not process vitals from video. Using mock vitals.");
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
      `Vitals detected (mock) — Heart Rate: ${mockV.heart_rate} bpm, Respiration: ${mockV.respiration} breaths/min`
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
                AI Intake Assessment
              </h1>
              <p className="text-sm text-muted-foreground">
                Describe your symptoms for an AI-powered triage evaluation
              </p>
            </div>
          </div>
          {mockMode && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700" data-testid="badge-mock-mode">
              <Shield className="mr-1 h-3 w-3" />
              Demo Mode
            </Badge>
          )}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="flex h-[calc(100vh-280px)] min-h-[500px] flex-col overflow-hidden">
              <CardHeader className="border-b bg-muted/30 py-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Intake Chat</CardTitle>
                </div>
                <CardDescription>Answer the AI's questions for an accurate assessment</CardDescription>
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
                          <p className="text-sm leading-relaxed">{msg.content}</p>

                          {msg.triage && (
                            <div className="mt-3 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm font-semibold">Triage Result</span>
                                <Badge
                                  className={`ml-auto ${getUrgencyColor(msg.triage.urgency)}`}
                                  data-testid="badge-urgency-inline"
                                >
                                  {msg.triage.urgency}
                                </Badge>
                              </div>
                              <div className="grid gap-2 text-sm">
                                <div>
                                  <span className="font-medium">Department:</span> {msg.triage.department}
                                </div>
                                <div>
                                  <span className="font-medium">Priority:</span>{" "}
                                  {getPriorityLabel(msg.triage.priority_level)} (Level {msg.triage.priority_level})
                                </div>
                                <div>
                                  <span className="font-medium">Reason:</span> {msg.triage.reason}
                                </div>
                                {msg.triage.triage_message && (
                                  <div className="mt-1 rounded-lg bg-white/60 p-2 text-xs italic">
                                    {msg.triage.triage_message}
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
                        <span className="text-sm text-muted-foreground">Analyzing...</span>
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
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={triage ? "Assessment complete" : "Describe your symptoms..."}
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
                    <span className="sr-only sm:not-sr-only sm:ml-1">Send</span>
                  </Button>
                </form>
              </div>
            </Card>
          </motion.div>

          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">Vitals from Video</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Record a 20–30 second face video, then upload for AI vitals extraction
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
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Vitals Video
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
                        <CardTitle className="text-base">Triage Result</CardTitle>
                      </div>
                      <Badge className={getUrgencyColor(triage.urgency)} data-testid="badge-urgency">
                        {triage.urgency}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground">Department</div>
                      <div className="text-sm font-semibold" data-testid="text-department">
                        {triage.department}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground">Priority</div>
                      <div className="text-sm font-semibold" data-testid="text-priority">
                        {getPriorityLabel(triage.priority_level)} (Level {triage.priority_level})
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <div className="text-xs font-medium text-muted-foreground">Reason</div>
                      <div className="text-sm" data-testid="text-reason">
                        {triage.reason}
                      </div>
                    </div>
                    {triage.triage_message && (
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <div className="text-sm italic text-primary" data-testid="text-triage-message">
                          {triage.triage_message}
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
                      <span className="text-sm font-medium text-muted-foreground">Debug — Last Response</span>
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
                          {lastResponse ? JSON.stringify(lastResponse, null, 2) : "No response yet."}
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
