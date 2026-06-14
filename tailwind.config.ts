import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Espresso ink — text, dark surfaces, primary actions (warm near-black, premium).
        brand: {
          50: "#F6F4F2",
          100: "#E9E4DF",
          200: "#CFC6BD",
          300: "#A89C8F",
          400: "#6E6358",
          500: "#3D352E",
          600: "#261F1A", // primary ink
          700: "#19130F",
          800: "#0E0A07",
          900: "#000000",
        },
        // Coral — the vivid-pastel star. Buttons, highlights, energy.
        accent: {
          50: "#FFF1EE",
          100: "#FFE1DB",
          200: "#FFC4B8",
          300: "#FF9E8C",
          400: "#F87765",
          500: "#EC5B4A", // primary coral
          600: "#D2402F",
          700: "#AE3122",
        },
        // Sage — calm secondary (wellness).
        sage: {
          50: "#F0F4EF",
          100: "#DEE8DB",
          200: "#BFD3BA",
          300: "#97B591",
          400: "#6E9268",
          500: "#547A4E",
          600: "#3F5E3A",
        },
        // Lavender — tertiary pop.
        lavender: {
          50: "#F3F0FB",
          100: "#E6E0F6",
          200: "#CDC1EE",
          300: "#AD9CE0",
          400: "#8E78D1",
          500: "#735BBC",
          600: "#5A459A",
        },
        // Soft clean whites (NOT beige — faint cool tint).
        cream: {
          DEFAULT: "#F8F7F9",
          50: "#FDFCFE",
          100: "#F2F1F4",
          200: "#E6E5E9",
        },
        // Cool-neutral grays.
        stone2: {
          50: "#F7F7F8",
          100: "#ECECEE",
          200: "#DCDCDF",
          300: "#BEBEC3",
          400: "#8B8B92",
          500: "#65656C",
          600: "#47474D",
          700: "#2C2C30",
          800: "#1A1A1D",
          900: "#101012",
        },
      },
      fontFamily: {
        // Body / UI
        sans: ["Inter", "system-ui", "sans-serif"],
        // Display — Bricolage Grotesque (original, modern, professional).
        // `font-serif` is kept as the class hook used across the app.
        serif: ["'Bricolage Grotesque'", "Inter", "system-ui", "sans-serif"],
        display: ["'Bricolage Grotesque'", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};
export default config;
