import { Link } from "wouter";
import { Activity, Github, Twitter, Linkedin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "AI Triage", href: "/intake" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/about" },
      { label: "Terms of Service", href: "/about" },
      { label: "HIPAA Compliance", href: "/about" },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
];

export default function Footer() {
  return (
    <footer data-testid="footer" className="gradient-navy text-white/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4" data-testid="link-footer-logo">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
                Lumina Health
              </span>
            </Link>
            <p className="text-sm text-white/60 max-w-xs mb-6">
              AI-powered emergency triage and vital sign analysis for faster, smarter healthcare decisions.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  data-testid={`link-social-${social.label.toLowerCase()}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3
                className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {column.title}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10 bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-white/40" data-testid="text-copyright">
            &copy; {new Date().getFullYear()} Lumina Health. All rights reserved.
          </p>
          <p className="text-sm text-white/40">
            Built with care for better healthcare outcomes.
          </p>
        </div>
      </div>
    </footer>
  );
}
