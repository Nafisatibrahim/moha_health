import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  Video,
  Zap,
  ShieldCheck,
  MessageSquareText,
  UploadCloud,
  ClipboardCheck,
  ArrowRight,
  CheckCircle,
  Activity,
  Users,
  Clock,
  Star,
} from "lucide-react";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const features = [
  { icon: Brain, titleKey: "home.feature1Title", descKey: "home.feature1Desc", color: "text-blue-600", bg: "bg-blue-50" },
  { icon: Video, titleKey: "home.feature2Title", descKey: "home.feature2Desc", color: "text-indigo-600", bg: "bg-indigo-50" },
  { icon: Zap, titleKey: "home.feature3Title", descKey: "home.feature3Desc", color: "text-amber-600", bg: "bg-amber-50" },
  { icon: ShieldCheck, titleKey: "home.feature4Title", descKey: "home.feature4Desc", color: "text-emerald-600", bg: "bg-emerald-50" },
];

const steps = [
  { icon: MessageSquareText, step: "01", titleKey: "home.step1Title", descKey: "home.step1Desc" },
  { icon: UploadCloud, step: "02", titleKey: "home.step2Title", descKey: "home.step2Desc" },
  { icon: ClipboardCheck, step: "03", titleKey: "home.step3Title", descKey: "home.step3Desc" },
];

const stats = [
  { value: "10,000+", labelKey: "home.stat1Label", icon: Activity },
  { value: "30s", labelKey: "home.stat2Label", icon: Clock },
  { value: "98%", labelKey: "home.stat3Label", icon: Star },
  { value: "24/7", labelKey: "home.stat4Label", icon: Users },
];

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden">
      <section data-testid="section-hero" className="relative py-20 sm:py-28 lg:py-36">
        <div className="absolute inset-0 gradient-hero-soft" />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary" data-testid="badge-hero">
                <Activity className="h-4 w-4" />
                {t("home.badgeHero")}
              </div>

              <h1
                className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
                style={{ fontFamily: "var(--font-heading)" }}
                data-testid="text-hero-headline"
              >
                {t("home.heroHeadline")}{" "}
                <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent">
                  {t("home.heroHeadlineHighlight")}
                </span>
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl" data-testid="text-hero-subtext">
                {t("home.heroSubtext")}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <Link href="/intake">
                <Button size="lg" className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/25 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" data-testid="button-hero-start-assessment" aria-label={t("home.startAssessment")}>
                  {t("home.startAssessment")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base" data-testid="button-hero-learn-more">
                  {t("home.learnMore")}
                </Button>
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
              data-testid="trust-badges"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                {t("home.hipaaAware")}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                {t("home.noAccountRequired")}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                {t("home.resultsInSeconds")}
              </span>
            </motion.div>
          </div>
        </div>
      </section>

      <section data-testid="section-features" className="py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-heading)" }} data-testid="text-features-heading">
              {t("home.featuresHeading")}{" "}
              <span className="text-primary">{t("home.featuresHeadingHighlight")}</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("home.featuresSubtext")}
            </p>
          </AnimatedSection>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, i) => (
              <AnimatedSection key={feature.titleKey} delay={i * 0.1}>
                <Card className="h-full border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300" data-testid={`card-feature-${i}`}>
                  <CardContent className="p-6">
                    <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}>
                      <feature.icon className={`h-6 w-6 ${feature.color}`} />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold" style={{ fontFamily: "var(--font-heading)" }}>
                      {t(feature.titleKey)}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {t(feature.descKey)}
                    </p>
                  </CardContent>
                </Card>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" data-testid="section-how-it-works" className="py-20 sm:py-28 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-heading)" }} data-testid="text-how-it-works-heading">
              {t("home.howItWorks")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("home.howItWorksSubtext")}
            </p>
          </AnimatedSection>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <AnimatedSection key={step.step} delay={i * 0.15}>
                <div className="relative text-center" data-testid={`step-${i}`}>
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <span className="mb-2 block text-xs font-bold uppercase tracking-widest text-primary/60">
                    {t("home.stepLabel", { num: step.step })}
                  </span>
                  <h3 className="mb-3 text-xl font-bold" style={{ fontFamily: "var(--font-heading)" }}>
                    {t(step.titleKey)}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t(step.descKey)}
                  </p>

                  {i < steps.length - 1 && (
                    <div className="absolute right-0 top-8 hidden -translate-y-1/2 translate-x-1/2 md:block">
                      <ArrowRight className="h-6 w-6 text-border" />
                    </div>
                  )}
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section data-testid="section-stats" className="py-20 sm:py-24 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {stats.map((stat, i) => (
                <div key={stat.label} className="text-center" data-testid={`stat-${i}`}>
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <p className="text-3xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{t(stat.labelKey)}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section data-testid="section-cta" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="relative overflow-hidden rounded-3xl gradient-navy px-8 py-16 text-center sm:px-16 sm:py-20">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary/10 blur-2xl" />
              </div>

              <div className="relative">
                <h2
                  className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
                  style={{ fontFamily: "var(--font-heading)" }}
                  data-testid="text-cta-heading"
                >
                  {t("home.ctaHeading")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
                  {t("home.ctaSubtext")}
                </p>
                <div className="mt-10">
                  <Link href="/intake">
                    <Button size="lg" className="h-12 px-10 text-base gap-2 bg-white text-foreground hover:bg-white/90 shadow-xl" data-testid="button-cta-start">
                      {t("home.startYourAssessment")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
