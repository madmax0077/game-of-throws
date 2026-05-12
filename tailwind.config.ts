import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Game of Throws brand palette
        brand: {
          50: "#fff1f1",
          100: "#ffdfdf",
          200: "#ffc5c5",
          300: "#ff9d9d",
          400: "#ff6464",
          500: "#f83838",
          600: "#e51d1d",
          700: "#c1272d", // primary
          800: "#9f1518",
          900: "#841718",
          950: "#480606"
        },
        ink: {
          50: "#f7f7f8",
          100: "#eeeef1",
          200: "#d9d9df",
          300: "#b8b8c2",
          400: "#8f8fa0",
          500: "#717185",
          600: "#5b5b6c",
          700: "#4a4a58",
          800: "#3f3f4a",
          900: "#0f1024", // primary dark
          950: "#070716"
        }
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        display: [
          "Poppins",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(15, 16, 36, 0.12)",
        glow: "0 10px 40px -10px rgba(193, 39, 45, 0.45)"
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)"
      }
    }
  },
  plugins: []
};

export default config;
