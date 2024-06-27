/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        light: {
          primary: '#ffffff',
          secondary: '#f8f9fa',
          accent: '#007bff',
          text: '#000000',
        },
        dark: {
          primary: '#0f0f0f',
          secondary: '#272727',
          accent: '#6610f2',
          text: '#ffffff',
        },
      },
    },
  },
  plugins: [],
}

