import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import {
  Brain,
  Eye,
  Shield,
  HeartPulse,
  Cpu,
  Users,
  Target,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function About() {
  return (
    <div className="min-h-screen">
      <section className="gradient-hero-soft py-20 lg:py-28">
        <div className="container mx-auto max-w-5xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl"
            data-testid="text-about-title"
          >
            About Lumina Health
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
            data-testid="text-about-subtitle"
          >
            We're building the future of emergency triage — combining artificial
            intelligence with computer-vision vitals to deliver faster, smarter
            healthcare decisions.
          </motion.p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Target className="h-4 w-4" />
                Our Mission
              </span>
              <h2
                className="mt-4 font-heading text-3xl font-bold tracking-tight"
                data-testid="text-mission-title"
              >
                Democratizing Emergency Healthcare
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Every second counts in an emergency. Lumina Health exists to
                eliminate bottlenecks in the triage process by providing
                AI-powered assessments that help patients understand the urgency
                of their symptoms and guide them to the right care — faster.
              </p>
              <p className="mt-3 text-muted-foreground leading-relaxed">
                Our platform combines conversational AI with contactless vital
                sign measurement, enabling anyone with a smartphone to receive an
                initial health assessment within seconds.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="grid grid-cols-2 gap-4"
            >
              {[
                { icon: Brain, label: "AI Triage Engine", desc: "NLP-powered symptom analysis" },
                { icon: Eye, label: "Video Vitals", desc: "Contactless heart & breath rate" },
                { icon: Shield, label: "Privacy First", desc: "HIPAA-aligned architecture" },
                { icon: HeartPulse, label: "Real-Time", desc: "Instant triage decisions" },
              ].map((item, i) => (
                <Card key={i} className="border-0 bg-muted/50">
                  <CardContent className="flex flex-col items-center p-6 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mt-3 font-heading text-sm font-semibold" data-testid={`text-capability-${i}`}>
                      {item.label}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <Separator />

      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Cpu className="h-4 w-4" />
              Technology
            </span>
            <h2
              className="mt-4 font-heading text-3xl font-bold tracking-tight"
              data-testid="text-technology-title"
            >
              How It Works Under the Hood
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Lumina Health is powered by a modern stack designed for reliability
              and speed.
            </p>
          </motion.div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Conversational AI",
                desc: "Our triage engine uses large language models to ask clinically relevant follow-up questions and assess symptom severity in real time.",
                icon: Brain,
              },
              {
                title: "Computer Vision Vitals",
                desc: "Using remote photoplethysmography (rPPG), we extract heart rate and respiration data from a short selfie video — no wearables required.",
                icon: Eye,
              },
              {
                title: "Smart Triage Classification",
                desc: "Symptoms and vitals are combined to generate a triage recommendation including urgency level, suggested department, and next steps.",
                icon: Sparkles,
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                <Card className="h-full border-0 bg-white shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="mt-4 font-heading text-lg font-semibold" data-testid={`text-tech-${i}`}>
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      <section className="py-16 lg:py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <Users className="h-4 w-4" />
              Team
            </span>
            <h2
              className="mt-4 font-heading text-3xl font-bold tracking-tight"
              data-testid="text-team-title"
            >
              Meet the Creator
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            variants={fadeUp}
            className="mx-auto mt-10 max-w-lg"
          >
            <Card className="border-0 bg-muted/40 shadow-sm">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10"
                  data-testid="img-author-avatar"
                >
                  <span className="font-heading text-3xl font-bold text-primary">LH</span>
                </div>
                <h3 className="mt-4 font-heading text-xl font-semibold" data-testid="text-author-name">
                  Lumina Health Team
                </h3>
                <p className="mt-1 text-sm font-medium text-primary" data-testid="text-author-role">
                  AI & Healthcare Engineering
                </p>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  A passionate team of engineers and healthcare professionals
                  dedicated to making emergency triage faster, smarter, and
                  accessible to everyone. We combine expertise in machine
                  learning, computer vision, and clinical workflows to build
                  technology that saves time — and lives.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      <section className="gradient-navy py-16">
        <div className="container mx-auto max-w-3xl px-6 text-center">
          <h2
            className="font-heading text-3xl font-bold tracking-tight text-white"
            data-testid="text-about-cta-title"
          >
            Ready to Experience AI Triage?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-blue-200/80">
            Try our AI-powered intake assistant and see how fast intelligent
            triage can be.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/intake">
              <Button size="lg" className="w-full sm:w-auto" data-testid="button-about-start-assessment">
                Start Assessment
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                variant="outline"
                size="lg"
                className="w-full border-white/20 text-white hover:bg-white/10 sm:w-auto"
                data-testid="button-about-contact"
              >
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
