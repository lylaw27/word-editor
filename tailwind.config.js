/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: '#333',
            p: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            h1: {
              fontWeight: '700',
              marginTop: '1em',
              marginBottom: '0.5em',
            },
            h2: {
              fontWeight: '600',
              marginTop: '1em',
              marginBottom: '0.5em',
            },
            h3: {
              fontWeight: '600',
              marginTop: '0.75em',
              marginBottom: '0.5em',
            },
            ul: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            ol: {
              marginTop: '0.5em',
              marginBottom: '0.5em',
            },
            li: {
              marginTop: '0.25em',
              marginBottom: '0.25em',
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
