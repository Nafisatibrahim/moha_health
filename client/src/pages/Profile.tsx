import { useEffect, useRef, useContext, useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { Auth0EnabledContext } from "@/lib/auth0-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, LogIn, LogOut, ClipboardList, Stethoscope, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const WELCOME_TOAST_KEY = "auth0_profile_welcome_shown";
const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

export interface HealthProfileShape {
  allergies: string;
  past_surgeries: string;
  last_surgery_date: string;
  chronic_conditions: string;
  medications: string;
  blood_type: string;
  family_history: string;
  other_relevant: string;
}

const emptyHealthProfile: HealthProfileShape = {
  allergies: "",
  past_surgeries: "",
  last_surgery_date: "",
  chronic_conditions: "",
  medications: "",
  blood_type: "",
  family_history: "",
  other_relevant: "",
};

function ProfileContent() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const logoutReturnTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const { toast } = useToast();
  const welcomeShownRef = useRef(false);
  const [baseUrl, setBaseUrl] = useState(DEFAULT_BASE_URL);
  const [healthProfile, setHealthProfile] = useState<HealthProfileShape>(() => ({ ...emptyHealthProfile }));
  const [healthProfileLoading, setHealthProfileLoading] = useState(false);
  const [healthProfileSaving, setHealthProfileSaving] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentItem[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user || welcomeShownRef.current) return;
    welcomeShownRef.current = true;
    const key = `${WELCOME_TOAST_KEY}_${user.sub ?? "user"}`;
    if (typeof window !== "undefined" && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      const name = user.name || user.email || t("profile.you");
      toast({
        title: t("profile.welcomeBack"),
        description: t("profile.welcomeBackDesc", { name }),
      });
    }
  }, [isAuthenticated, user, t, toast]);

  useEffect(() => {
    fetch(`${DEFAULT_BASE_URL}/frontend-config`)
      .then((r) => r.json())
      .then((c: { backend_base_url?: string }) => {
        if (c?.backend_base_url) setBaseUrl(c.backend_base_url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return;
    setHealthProfileLoading(true);
    fetch(`${baseUrl}/profile/health?patient_id=${encodeURIComponent(user.sub)}`)
      .then((r) => {
        if (!r.ok) {
          r.json().catch(() => ({})).then((body: { detail?: string }) => {
            toast({ title: t("common.error"), description: body?.detail ?? r.statusText, variant: "destructive" });
          });
          return Promise.resolve({ health_profile: {} as Record<string, string> });
        }
        return r.json() as Promise<{ health_profile?: Record<string, string> }>;
      })
      .then((data: { health_profile?: Record<string, string> }) => {
        const p = data?.health_profile;
        if (p && typeof p === "object") {
          setHealthProfile({
            ...emptyHealthProfile,
            allergies: p.allergies ?? "",
            past_surgeries: p.past_surgeries ?? "",
            last_surgery_date: p.last_surgery_date ?? "",
            chronic_conditions: p.chronic_conditions ?? "",
            medications: p.medications ?? "",
            blood_type: p.blood_type ?? "",
            family_history: p.family_history ?? "",
            other_relevant: p.other_relevant ?? "",
          });
        }
      })
      .catch(() => toast({ title: t("common.error"), description: "Could not load health profile", variant: "destructive" }))
      .finally(() => setHealthProfileLoading(false));
  }, [isAuthenticated, user?.sub, baseUrl]);

  useEffect(() => {
    if (!isAuthenticated || !user?.sub) return;
    setAssessmentsLoading(true);
    fetch(`${baseUrl}/profile/assessments?patient_id=${encodeURIComponent(user.sub)}`)
      .then((r) => {
        if (!r.ok) {
          r.json().catch(() => ({})).then((body: { detail?: string }) => {
            toast({ title: t("common.error"), description: body?.detail ?? r.statusText, variant: "destructive" });
          });
          return Promise.resolve({ assessments: [] as AssessmentItem[] });
        }
        return r.json() as Promise<{ assessments?: AssessmentItem[] }>;
      })
      .then((data: { assessments?: AssessmentItem[] }) => {
        const list = Array.isArray(data?.assessments) ? data.assessments : [];
        setAssessments(list);
      })
      .catch(() => {
        toast({ title: t("common.error"), description: "Could not load assessment history", variant: "destructive" });
        setAssessments([]);
      })
      .finally(() => setAssessmentsLoading(false));
  }, [isAuthenticated, user?.sub, baseUrl]);

  const handleSaveHealthProfile = () => {
    if (!user?.sub) return;
    setHealthProfileSaving(true);
    fetch(`${baseUrl}/profile/health`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: user.sub, health_profile: healthProfile }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Save failed");
        toast({ title: t("profile.saved"), description: "" });
      })
      .catch(() => toast({ title: "Error", description: "Could not save health profile", variant: "destructive" }))
      .finally(() => setHealthProfileSaving(false));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="profile-login-prompt-title">
            {t("profile.signInToView")}
          </h1>
          <p className="mt-2 text-muted-foreground">{t("profile.signInToViewDesc")}</p>
          <Button
            className="mt-6 gap-2"
            onClick={() => loginWithRedirect()}
            data-testid="profile-login-button"
          >
            <LogIn className="h-4 w-4" />
            {t("nav.login")}
          </Button>
        </motion.div>
      </div>
    );
  }

  const displayName = user.name || user.email || t("nav.profile");
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen">
      <section className="gradient-hero-soft py-12 lg:py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={user.picture} alt={displayName} />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight" data-testid="profile-name">
                {displayName}
              </h1>
              {user.email && (
                <p className="mt-1 text-muted-foreground" data-testid="profile-email">
                  {user.email}
                </p>
              )}
              <p className="mt-2 text-sm text-primary font-medium">{t("profile.signedIn")}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 gap-2"
                onClick={() => logout({ logoutParams: { returnTo: logoutReturnTo } })}
                data-testid="profile-logout"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.logout")}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("profile.healthProfile")}</CardTitle>
            </div>
            <CardDescription className="text-xs">{t("profile.healthProfileDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {healthProfileLoading ? (
              <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t("intake.allergies")}</Label>
                    <Input
                      placeholder={t("intake.allergiesPlaceholder")}
                      value={healthProfile.allergies}
                      onChange={(e) => setHealthProfile((p) => ({ ...p, allergies: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("intake.pastSurgeries")}</Label>
                    <Input
                      placeholder={t("intake.pastSurgeriesPlaceholder")}
                      value={healthProfile.past_surgeries}
                      onChange={(e) => setHealthProfile((p) => ({ ...p, past_surgeries: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("intake.lastSurgeryDate")}</Label>
                  <Input
                    placeholder={t("intake.lastSurgeryDatePlaceholder")}
                    value={healthProfile.last_surgery_date}
                    onChange={(e) => setHealthProfile((p) => ({ ...p, last_surgery_date: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("intake.chronicConditions")}</Label>
                  <Input
                    placeholder={t("intake.chronicConditionsPlaceholder")}
                    value={healthProfile.chronic_conditions}
                    onChange={(e) => setHealthProfile((p) => ({ ...p, chronic_conditions: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("intake.currentMedications")}</Label>
                  <Input
                    placeholder={t("intake.currentMedicationsPlaceholder")}
                    value={healthProfile.medications}
                    onChange={(e) => setHealthProfile((p) => ({ ...p, medications: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("intake.bloodType")}</Label>
                  <Input
                    placeholder={t("intake.bloodTypePlaceholder")}
                    value={healthProfile.blood_type}
                    onChange={(e) => setHealthProfile((p) => ({ ...p, blood_type: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("intake.familyHistory")}</Label>
                  <Input
                    placeholder={t("intake.familyHistoryPlaceholder")}
                    value={healthProfile.family_history}
                    onChange={(e) => setHealthProfile((p) => ({ ...p, family_history: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("intake.otherRelevant")}</Label>
                  <Textarea
                    placeholder={t("intake.otherRelevantPlaceholder")}
                    value={healthProfile.other_relevant}
                    onChange={(e) => setHealthProfile((p) => ({ ...p, other_relevant: e.target.value }))}
                    className="min-h-[60px] text-sm resize-none"
                    rows={2}
                  />
                </div>
                <Button onClick={handleSaveHealthProfile} disabled={healthProfileSaving}>
                  {healthProfileSaving ? t("common.loading") : t("profile.save")}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t("profile.history")}
            </CardTitle>
            <CardDescription>{t("profile.historyDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {assessmentsLoading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
            ) : assessments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20 py-12 text-center">
                <Stethoscope className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-medium text-muted-foreground">
                  {t("profile.historyPlaceholder")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/80">{t("profile.historyPlaceholderHint")}</p>
                <Link href="/intake">
                  <Button variant="outline" className="mt-4 gap-2" data-testid="profile-start-assessment">
                    <Stethoscope className="h-4 w-4" />
                    {t("nav.startAssessment")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {assessments.map((a) => {
                  const id = (a.id ?? a.session_id) as string;
                  const isExpanded = expandedId === id;
                  const dateStr = a.created_at
                    ? new Date(a.created_at).toLocaleDateString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "";
                  return (
                    <div
                      key={id}
                      className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {a.primary_symptom || t("profile.historyPlaceholder")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {dateStr}
                            {a.specialist ? ` · ${a.specialist}` : ""}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                            a.urgency === "HIGH"
                              ? "bg-destructive/15 text-destructive"
                              : a.urgency === "MEDIUM"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {a.urgency || "—"}
                        </span>
                      </div>
                      {a.report?.trim() && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 h-8 gap-1 text-xs"
                            onClick={() => setExpandedId(isExpanded ? null : id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                            {t("profile.viewReport")}
                          </Button>
                          {isExpanded && (
                            <div className="mt-2 rounded border bg-muted/30 p-3 text-xs whitespace-pre-wrap text-muted-foreground">
                              {a.report}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                <Link href="/intake">
                  <Button variant="outline" className="w-full gap-2" data-testid="profile-start-assessment">
                    <Stethoscope className="h-4 w-4" />
                    {t("nav.startAssessment")}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default function Profile() {
  const { t } = useTranslation();
  const auth0Enabled = useContext(Auth0EnabledContext);

  if (!auth0Enabled) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">{t("profile.authNotConfigured")}</p>
      </div>
    );
  }

  return <ProfileContent />;
}
