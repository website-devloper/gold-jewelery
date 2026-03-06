import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ['selector', '[data-mode="dark"]'], // Effectively disables dark mode unless this specific attribute is present
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      fontFamily: {
        sans: ["var(--font-bader-goldstar)", "system-ui", "sans-serif"],
        heading: ["var(--font-bader-goldstar)", "system-ui", "sans-serif"],
        mono: ["var(--font-bader-goldstar)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
