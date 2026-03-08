import { useState, useContext } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth0 } from "@auth0/auth0-react";
import { Menu, Activity, Globe, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Auth0EnabledContext } from "@/lib/auth0-context";

const LOCALES = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "es", label: "ES" },
] as const;

function NavAuthButtons() {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0();
  const logoutReturnTo = typeof window !== "undefined" ? window.location.origin : undefined;

  if (isLoading) return null;
  if (isAuthenticated && user) {
    const displayName = user.name || user.email || t("nav.profile");
    const initials = displayName.slice(0, 2).toUpperCase();
    const handleLogout = () => logout({ logoutParams: { returnTo: logoutReturnTo } });
    return (
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user-menu" aria-label={t("nav.profile")}>
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.picture} alt={displayName} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <span className="hidden sm:inline max-w-24 truncate text-sm">{displayName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm font-medium truncate">{displayName}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex cursor-pointer items-center" data-testid="link-profile">
                <User className="mr-2 h-4 w-4" />
                {t("nav.profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
              <LogOut className="mr-2 h-4 w-4" />
              {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-1.5 shrink-0"
          data-testid="button-signout-nav"
          aria-label={t("nav.logout")}
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{t("nav.logout")}</span>
        </Button>
      </div>
    );
  }
  const signup = () =>
    loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={signup} data-testid="button-signup" className="gap-1.5">
        {t("nav.signup")}
      </Button>
      <Button variant="default" size="sm" onClick={() => loginWithRedirect()} data-testid="button-login" className="gap-1.5">
        <LogIn className="h-4 w-4" />
        {t("nav.login")}
      </Button>
    </div>
  );
}

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const auth0Enabled = useContext(Auth0EnabledContext);

  const navLinks = [
    { href: "/", labelKey: "nav.home" as const },
    { href: "/intake", labelKey: "nav.intake" as const },
    { href: "/profile", labelKey: "nav.profile" as const },
    { href: "/#how-it-works", labelKey: "nav.howItWorks" as const },
    { href: "/about", labelKey: "nav.about" as const },
    { href: "/contact", labelKey: "nav.contact" as const },
  ];

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
            {t("nav.brand")}
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
                data-testid={`link-nav-${link.labelKey.split(".").pop()}`}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5" aria-label={t("nav.language")}>
                <Globe className="h-4 w-4" />
                <span>{LOCALES.find((l) => l.code === i18n.language)?.label ?? "EN"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {LOCALES.map((loc) => (
                <DropdownMenuItem
                  key={loc.code}
                  onClick={() => i18n.changeLanguage(loc.code)}
                >
                  {loc.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {auth0Enabled && <NavAuthButtons />}
          <Link href="/intake">
            <Button data-testid="button-start-assessment" size="sm">
              {t("nav.startAssessment")}
            </Button>
          </Link>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setOpen(true)}
          data-testid="button-mobile-menu"
          aria-label={t("common.openMenu")}
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
                {t("nav.brand")}
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
                      data-testid={`link-mobile-${link.labelKey.split(".").pop()}`}
                      className={`block px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "text-primary bg-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      {t(link.labelKey)}
                    </Link>
                  </SheetClose>
                );
              })}
              {auth0Enabled && (
                <div className="mt-4 px-3">
                  <NavAuthButtons />
                </div>
              )}
              <div className="mt-4 px-3">
                <SheetClose asChild>
                  <Link href="/intake">
                    <Button className="w-full" data-testid="button-mobile-start-assessment">
                      {t("nav.startAssessment")}
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
