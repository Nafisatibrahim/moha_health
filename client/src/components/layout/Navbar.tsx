import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/intake", label: "Intake" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();

  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-50 w-full glass border-b border-border/50"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Lumina Health
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" data-testid="nav-desktop">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? location === "/"
                : location.startsWith(link.href.replace("/#", "/"));
            return (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`link-nav-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/intake">
            <Button data-testid="button-start-assessment" size="sm">
              Start Assessment
            </Button>
          </Link>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(true)}
          data-testid="button-mobile-menu"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Activity className="h-4 w-4" />
                </div>
                Lumina Health
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-8 flex flex-col gap-1" data-testid="nav-mobile">
              {navLinks.map((link) => {
                const isActive =
                  link.href === "/"
                    ? location === "/"
                    : location.startsWith(link.href.replace("/#", "/"));
                return (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      data-testid={`link-mobile-${link.label.toLowerCase().replace(/\s+/g, "-")}`}
                      className={`block px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "text-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </SheetClose>
                );
              })}
              <div className="mt-4 px-3">
                <SheetClose asChild>
                  <Link href="/intake">
                    <Button className="w-full" data-testid="button-mobile-start-assessment">
                      Start Assessment
                    </Button>
                  </Link>
                </SheetClose>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
