import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssTypography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/streamdown/dist/**/*.{js,cjs,mjs}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-noto-sans-sc)", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "sans-serif"],
      },
      colors: {
        border: "rgba(255, 255, 255, 0.12)",
        input: "rgba(255, 255, 255, 0.12)",
        ring: "#60a5fa",
        background: {
          DEFAULT: "#0a0a0a",
          secondary: "#1a1a1a",
          tertiary: "#2a2a2a",
        },
        foreground: {
          DEFAULT: "#ffffff",
          secondary: "#a0a0a0",
          tertiary: "#707070",
        },
        muted: {
          DEFAULT: "#1a1a1a",
          foreground: "#a0a0a0",
        },
        primary: {
          DEFAULT: "#3b82f6",
          foreground: "#ffffff",
          hover: "#2563eb",
          light: "#60a5fa",
        },
        secondary: {
          DEFAULT: "#1f2937",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        accent: {
          DEFAULT: "rgba(255, 255, 255, 0.08)",
          foreground: "#ffffff",
          blue: "#3b82f6",
          purple: "#8b5cf6",
          pink: "#ec4899",
          green: "#10b981",
        },
        popover: {
          DEFAULT: "#121212",
          foreground: "#ffffff",
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.9)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssTypography],
};

export default config;
