import { useEffect, useRef, useContext } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { Auth0EnabledContext } from "@/lib/auth0-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, LogIn, LogOut, ClipboardList, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const WELCOME_TOAST_KEY = "auth0_profile_welcome_shown";

function ProfileContent() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const logoutReturnTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const { toast } = useToast();
  const welcomeShownRef = useRef(false);

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

      <section className="container mx-auto max-w-3xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {t("profile.history")}
            </CardTitle>
            <CardDescription>{t("profile.historyDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
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
