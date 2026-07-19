/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#080b11",
        card: "rgba(17, 25, 40, 0.75)",
        border: "rgba(255, 255, 255, 0.08)",
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          glow: "rgba(59, 130, 246, 0.15)",
        },
        secondary: {
          DEFAULT: "#a855f7",
          glow: "rgba(168, 85, 247, 0.15)",
        },
        success: "#10b981",
        warning: "#f59e0b",
        destructive: "#ef4444",
        muted: "#9ca3af",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
}
