/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kirana: {
          teal: "#5AC8C8",
          "teal-light": "#E8F7F7",
          "teal-mid": "#B8E8E8",
          navy: "#1E293B",
          beige: "#F5F0E8",
          "beige-border": "#E8DDD0",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        opendyslexic: ["OpenDyslexic", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};
