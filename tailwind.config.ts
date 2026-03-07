import type { Config } from "tailwindcss";

// Tailwind v4 is configured via CSS (@theme in client/src/index.css).
// This file exists for shadcn/ui CLI and tooling; actual theme is in CSS.
export default {
  content: ["./client/index.html", "./client/src/**/*.{js,ts,jsx,tsx}"],
} satisfies Config;
