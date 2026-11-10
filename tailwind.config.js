/** @type {import('tailwindcss').Config} */
export default {
  // src/utils entra no scan porque os temas das áreas (classes Tailwind) vivem em view-helpers.js
  content: ["./src/views/**/*.ejs", "./src/utils/**/*.js", "./public/**/*.js"],
  theme: {
    extend: {
      colors: {
        nature: { botanic: "#1E4D3B", amber: "#D8AC3D" },
        languages: { navy: "#365B63" },
        humanities: { terracotta: "#A85F3B" },
        boutique: { bg: "#FBF7EF", text: "#24362F" }
      },
      fontFamily: { sans: ["Inter", "Lexend", "sans-serif"] }
    }
  },
  plugins: []
};
