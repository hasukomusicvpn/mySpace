export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        /* =========================
           DARK GALAXY (PRIMARY)
           ========================= */

        'galaxy-bg': '#0B0F1A',
        'galaxy-void': '#05070D',
        'galaxy-card': '#141A2E',
        'galaxy-border': '#1E2642',

        'galaxy-blue': '#4F7CFF',
        'galaxy-purple': '#8B7CFF',
        'galaxy-teal': '#4FD1C5',
        'galaxy-amber': '#FBBF24',

        'galaxy-text': '#F8FAFF',
        'galaxy-muted': '#B6BDD6',
        'galaxy-subtle': '#7C86A2',

        /* =========================
           LIGHT GALAXY (OPTIONAL)
           ========================= */

        'galaxy-light-bg': '#F2F4FF',
        'galaxy-light-card': '#E6E8FF',
        'galaxy-white': '#FFFFFF',

        'galaxy-dark-text': '#0B0F1A',
        'galaxy-gray-text': '#4A5568'
      }
    }
  },
  plugins: []
}