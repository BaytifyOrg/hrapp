import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f1f3",
          100: "#d8dbe0",
          200: "#b0b7c1",
          300: "#8892a3",
          400: "#606e84",
          500: "#232D3E",
          600: "#1c2433",
          700: "#151b27",
          800: "#0e121a",
          900: "#07090d",
        },
        gold: {
          100: "#f5ede0",
          300: "#d9c4a3",
          500: "#C2B08B",
          700: "#9a8a6a",
        },
        cream: "#FFFDF6",
      },
      fontFamily: {
        sans: ["TT Hoves", "DM Sans", "Inter", "system-ui", "sans-serif"],
        display: ["The Seasons", "Playfair Display", "Georgia", "serif"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #232D3E 0%, #1c2433 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
