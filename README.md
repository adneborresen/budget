# Budget Overview

---

A personal budgeter built with React and Firebase to help me keep track of my finances. 

Track income and expenses with discrete line items, visualize spending with charts, and sync everything to the cloud.

Live at: https://budget.adneborresen.no/

## Features

- **Item-based budgeting** - each expense is a named line item (Rent, Netflix, Groceries) with its own amount and frequency
- **Two item modes**:
  - *Fixed Recurring* - manual amount + frequency (daily/weekly/monthly/yearly)
  - *Track to Learn* - log purchases over time, the app infers your spending pattern and suggests a budget allocation
- **Frequency conversion** - view all amounts normalized to daily, weekly, monthly, or yearly
- **Extraordinary toggle** - exclude one-off items from your core budget to see the baseline
- **Charts** - pie chart for expense distribution, bar chart for category totals (via Recharts)
- **Cloud sync** - all data persisted to Firebase Firestore in real-time
- **Multi-language** - Norwegian (default) and English
- **Google Sign-In** - Firebase Authentication with Google OAuth

## Tech Stack

| Layer     | Technology                  |
| --------- | --------------------------- |
| Framework | React 19                    |
| Bundler   | Vite 6                      |
| Backend   | Firebase (Auth + Firestore) |
| Charts    | Recharts                    |
| Icons     | Lucide React                |
| Hosting   | Vercel                      |
| CI/CD     | Vercel                      |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Firebase Setup

The app uses Firebase for authentication and data storage. The Firebase config is in `src/firebase.js`. To use your own Firebase project:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** with Google sign-in provider
3. Enable **Cloud Firestore**
4. Replace the config object in `src/firebase.js` with your project's config
5. Deploy Firestore security rules: `firebase deploy --only firestore:rules`

## Project Structure

```
src/
  App.jsx                 # Auth wrapper, login screen
  BudgetCalculator.jsx    # Main app component (UI, state, Firestore sync)
  firebase.js             # Firebase initialization
  i18n.jsx                # Translation context (NO/EN)
  main.jsx                # React entry point
  index.css               # Global CSS reset
```

## Deployment

Pushes to `master` automatically deploy to Vercel. The live URL is configured as `https://budget.adneborresen.no/`.

## Data Model

All budget data lives in Firestore under `/users/{userId}`:

```
categories: [
  {
    id, name, collapsed, isIncome,
    items: [
      // Fixed item:
      { id, name, amount, frequency, mode: "fixed", isExtraordinary }
      // Tracking item:
      { id, name, mode: "tracking", purchases: [{date, amount}], locked, isExtraordinary }
    ]
  }
]
```

## Security

Firestore rules enforce that each user can only read/write their own `/users/{uid}` document. Please note that I may theoretically have access to your data since I am the owner of the Firebase project.
