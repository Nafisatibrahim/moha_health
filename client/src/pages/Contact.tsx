import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Mail,
  MapPin,
  Phone,
  Send,
  Clock,
  CheckCircle,
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

export default function Contact() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSubmitted(true);
      toast({
        title: "Message sent!",
        description: "We'll get back to you within 24 hours.",
      });
    }, 1200);
  };

  return (
    <div className="min-h-screen">
      <section className="gradient-hero-soft py-20 lg:py-28">
        <div className="container mx-auto max-w-5xl px-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-heading text-4xl font-bold tracking-tight text-foreground md:text-5xl"
            data-testid="text-contact-title"
          >
            Get in Touch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
            data-testid="text-contact-subtitle"
          >
            Have questions about Lumina Health? We'd love to hear from you.
            Reach out and our team will respond within 24 hours.
          </motion.p>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="container mx-auto max-w-5xl px-6">
          <div className="grid gap-12 lg:grid-cols-5">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={0}
              variants={fadeUp}
              className="lg:col-span-3"
            >
              <h2
                className="font-heading text-2xl font-bold tracking-tight"
                data-testid="text-form-title"
              >
                Send Us a Message
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill out the form below and we'll get back to you as soon as
                possible.
              </p>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-8 flex flex-col items-center rounded-xl border bg-muted/30 p-12 text-center"
                  data-testid="status-form-success"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h3 className="mt-4 font-heading text-xl font-semibold">
                    Thank You!
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Your message has been received. Our team will review it and
                    get back to you within 24 hours.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-6"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: "", email: "", message: "" });
                    }}
                    data-testid="button-send-another"
                  >
                    Send Another Message
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Full Name
                    </label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Jane Doe"
                      value={formData.name}
                      onChange={handleChange}
                      data-testid="input-name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Email Address
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="jane@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      data-testid="input-email"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="mb-1.5 block text-sm font-medium"
                    >
                      Message
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      rows={5}
                      placeholder="Tell us how we can help..."
                      value={formData.message}
                      onChange={handleChange}
                      data-testid="input-message"
                    />
                  </div>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={sending}
                    className="w-full sm:w-auto"
                    data-testid="button-submit"
                  >
                    {sending ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              )}
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={1}
              variants={fadeUp}
              className="space-y-6 lg:col-span-2"
            >
              <h2 className="font-heading text-2xl font-bold tracking-tight">
                Contact Info
              </h2>
              <p className="text-sm text-muted-foreground">
                Prefer to reach out directly? Use any of the methods below.
              </p>

              <div className="space-y-4">
                <Card className="border-0 bg-muted/40 shadow-sm">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" data-testid="text-email-label">Email</p>
                      <p className="mt-0.5 text-sm text-muted-foreground" data-testid="text-email-value">
                        support@luminahealth.ai
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-muted/40 shadow-sm">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" data-testid="text-phone-label">Phone</p>
                      <p className="mt-0.5 text-sm text-muted-foreground" data-testid="text-phone-value">
                        +1 (555) 123-4567
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-muted/40 shadow-sm">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" data-testid="text-address-label">Office</p>
                      <p className="mt-0.5 text-sm text-muted-foreground" data-testid="text-address-value">
                        350 Health Innovation Blvd
                        <br />
                        Suite 200, San Francisco, CA 94107
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-muted/40 shadow-sm">
                  <CardContent className="flex items-start gap-4 p-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold" data-testid="text-hours-label">Business Hours</p>
                      <p className="mt-0.5 text-sm text-muted-foreground" data-testid="text-hours-value">
                        Mon – Fri: 9:00 AM – 6:00 PM PST
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 overflow-hidden rounded-xl border bg-muted/20">
                <div
                  className="flex h-48 items-center justify-center bg-muted/40"
                  data-testid="placeholder-map"
                >
                  <div className="text-center">
                    <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground/60">
                      Map placeholder
                    </p>
                    <p className="text-xs text-muted-foreground/40">
                      San Francisco, CA
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
