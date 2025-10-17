# Crimson Ledger

Crimson Ledger is a beautiful, local-first personal budget tracker built by the team at [Teda.dev](https://teda.dev), the simplest AI app builder for regular people. This project provides a responsive landing page and a fully functional app you can run in your browser.

Features
- Add incomes and expenses with category, date, and notes
- Persistent storage using browser localStorage
- Quick totals for income, expense, and balance
- Search and month filtering
- Simple SVG bar chart for monthly overview and category breakdown
- Import and export JSON for backups

Getting started
1. Open index.html in your browser to view the landing page, then click Start Tracking to go to the app.
2. The app is fully client-side and requires no server. All data is saved locally in your browser.

Files
- index.html - Creative product landing page and CTA
- app.html - Main application interface
- styles/main.css - Custom CSS augmentation
- scripts/helpers.js - Storage and formatting utilities
- scripts/ui.js - UI rendering and App methods
- scripts/main.js - Entry point that initializes the app

Notes on design
- The application uses Tailwind CSS via CDN for rapid styling and a set of custom components defined in index.html.
- The primary brand color is red (Tailwind red-600) for buttons and accents.

Accessibility and UX
- Semantic markup, keyboard navigable controls, and visible focus rings have been considered.
- All interactive features are large enough for touch on mobile.

License
MIT
