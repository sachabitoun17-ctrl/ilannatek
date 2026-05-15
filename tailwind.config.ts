import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sant-roch inspired: deep ink as primary action, warm cream surface
        brand: {
          50: "#F5F2EC",
          100: "#EAE3D4",
          200: "#D4C7AC",
          300: "#B7A47D",
          400: "#8E7A52",
          500: "#5E513A",
          600: "#1C1C1A", // primary
          700: "#0F0F0E",
          800: "#000000",
          900: "#000000",
        },
        // Warm gold accent (subtle highlights, badges)
        accent: {
          50: "#FBF6EC",
          100: "#F3E8CE",
          200: "#E6D29D",
          300: "#D4B36A",
          400: "#BC944A",
          500: "#A07B3A",
          600: "#7E5F2B",
        },
        // Off-white / cream surfaces
        cream: {
          DEFAULT: "#F7F3EC",
          50: "#FAF7F1",
          100: "#F2EDE2",
          200: "#E8E0CE",
        },
        // Warm-toned grays (replace cold neutral)
        stone2: {
          50: "#F8F6F1",
          100: "#EFEAE0",
          200: "#DDD5C5",
          300: "#BFB5A1",
          400: "#928775",
          500: "#6E6555",
          600: "#4E4738",
          700: "#322E25",
          800: "#1F1D17",
          900: "#13110D",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Cormorant Garamond", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
