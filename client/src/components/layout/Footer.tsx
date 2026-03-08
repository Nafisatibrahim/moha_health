import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Activity, Github, Twitter, Linkedin } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const footerColumnKeys = [
  {
    titleKey: "footer.product" as const,
    links: [
      { labelKey: "footer.aiTriage" as const, href: "/intake" },
      { labelKey: "footer.howItWorks" as const, href: "/#how-it-works" },
      { labelKey: "footer.features" as const, href: "/#features" },
    ],
  },
  {
    titleKey: "footer.company" as const,
    links: [
      { labelKey: "footer.about" as const, href: "/about" },
      { labelKey: "footer.contact" as const, href: "/contact" },
      { labelKey: "footer.careers" as const, href: "/contact" },
    ],
  },
  {
    titleKey: "footer.legal" as const,
    links: [
      { labelKey: "footer.privacyPolicy" as const, href: "/about" },
      { labelKey: "footer.termsOfService" as const, href: "/about" },
      { labelKey: "footer.hipaaCompliance" as const, href: "/about" },
    ],
  },
];

const socialLinks = [
  { icon: Twitter, href: "#", labelKey: "footer.twitter" as const },
  { icon: Github, href: "#", labelKey: "footer.github" as const },
  { icon: Linkedin, href: "#", labelKey: "footer.linkedin" as const },
];

export default function Footer() {
  const { t } = useTranslation();
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
                {t("footer.brand")}
              </span>
            </Link>
            <p className="text-sm text-white/60 max-w-xs mb-6">
              {t("footer.tagline")}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.labelKey}
                  href={social.href}
                  data-testid={`link-social-${social.labelKey.split(".").pop()}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label={t(social.labelKey)}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {footerColumnKeys.map((column) => (
            <div key={column.titleKey}>
              <h3
                className="text-sm font-semibold uppercase tracking-wider text-white/40 mb-4"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {t(column.titleKey)}
              </h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.labelKey}>
                    <Link
                      href={link.href}
                      data-testid={`link-footer-${link.labelKey.split(".").pop()}`}
                      className="text-sm text-white/60 transition-colors hover:text-white"
                    >
                      {t(link.labelKey)}
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
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
          <p className="text-sm text-white/40">
            {t("footer.builtWithCare")}
          </p>
        </div>
      </div>
    </footer>
  );
}
