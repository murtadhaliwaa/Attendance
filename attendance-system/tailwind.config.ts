import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-page": "#12141a",
        "bg-sidebar": "#15171d",
        "bg-card": "#1a1d24",
        "bg-elevated": "#22252e",
        "bg-border": "#2a2d36",

        "text-primary": "#e8eaed",
        "text-secondary": "#9aa0ab",
        "text-muted": "#6b7280",

        "blue-primary": "#7b8fa8",
        "blue-dark": "#657890",
        "cyan-accent": "#8b9eb5",

        "status-present": "#7a9e8e",
        "status-absent": "#b08a8a",
        "status-late": "#b0a080",
        "status-overtime": "#9a8fb0",
        "status-off": "#6b7280",

        "row-present": "transparent",
        "row-absent": "transparent",
        "row-late": "transparent",
      },
      fontFamily: {
        arabic: ["Noto Sans Arabic", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
