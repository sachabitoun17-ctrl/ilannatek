import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Modern cool-ink: dark surfaces, primary actions, primary text.
        brand: {
          50: "#EEF0F4",
          100: "#D9DCE3",
          200: "#B4B9C6",
          300: "#878D9F",
          400: "#565C6E",
          500: "#2C313E",
          600: "#16181F", // primary ink
          700: "#0E0F14",
          800: "#08090C",
          900: "#000000",
        },
        // Vermillion energy — highlights, badges, the occasional bold CTA.
        accent: {
          50: "#FFF1ED",
          100: "#FFDFD6",
          200: "#FFBCA9",
          300: "#FF9374", // bright text on dark
          400: "#FF6A43",
          500: "#F2481F", // primary accent
          600: "#CE360F",
          700: "#A32A0C",
        },
        // Clean, cool-neutral light surfaces (kills the warm "AI cream" tell).
        cream: {
          DEFAULT: "#F5F5F4",
          50: "#FBFBFA",
          100: "#F1F1EF",
          200: "#E5E5E2",
        },
        // Neutral grays (de-warmed for a crisper, more modern feel).
        stone2: {
          50: "#F6F6F5",
          100: "#ECECEA",
          200: "#DCDCD9",
          300: "#BFBFBB",
          400: "#8C8C87",
          500: "#65655F",
          600: "#474742",
          700: "#2B2B27",
          800: "#1A1A17",
          900: "#101010",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
