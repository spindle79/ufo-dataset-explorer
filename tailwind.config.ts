import type { Config } from "tailwindcss";

// Tailwind CSS v4 uses CSS-first configuration
// Theme can be defined in CSS using @theme directive
// This config file is kept for compatibility but content detection is automatic in v4
const config: Config = {
  // content is optional in v4 (automatic detection)
  // Keeping it for explicit control if needed
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
