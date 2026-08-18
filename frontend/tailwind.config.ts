import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";
import tailwindcssTypography from "@tailwindcss/typography";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-noto-sans-sc)", "sans-serif"],
        heading: ["var(--font-space-grotesk)", "var(--font-noto-sans-sc)", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        // 字阶：页面名 / 区块 / 卡片 / 元数据
        "page": ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
        "section": ["1.75rem", { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "600" }],
        "card-title": ["1.125rem", { lineHeight: "1.35", fontWeight: "500" }],
        "meta": ["0.8125rem", { lineHeight: "1.4", fontWeight: "400" }],
      },
      colors: {
        // 暖米金 + 同色相暖灰
        border: "rgba(245, 240, 230, 0.12)",
        input: "rgba(245, 240, 230, 0.12)",
        ring: "#d4b483",
        background: {
          DEFAULT: "#16140f",
          secondary: "#1f1c16",
          tertiary: "#2e2a22",
        },
        foreground: {
          DEFAULT: "#f5f0e6",
          secondary: "#b0a693",
          tertiary: "#857a68",
        },
        muted: {
          DEFAULT: "#1f1c16",
          foreground: "#b0a693",
        },
        primary: {
          DEFAULT: "#d4b483",
          foreground: "#1a1610",
          hover: "#c4a372",
          light: "#e4cda6",
        },
        secondary: {
          DEFAULT: "#2e2a22",
          foreground: "#f5f0e6",
        },
        destructive: {
          DEFAULT: "#c45c4a",
          foreground: "#f5f0e6",
        },
        accent: {
          DEFAULT: "rgba(245, 240, 230, 0.06)",
          foreground: "#f5f0e6",
        },
        popover: {
          DEFAULT: "#1f1c16",
          foreground: "#f5f0e6",
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
