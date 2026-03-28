import React, { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  no: {
    budgetOverview: 'Budsjettoversikt',
    subtitle: 'Hver krone, gjort rede for',
    signInWithGoogle: 'Logg inn med Google',
    signInToSync: 'Logg inn for å synkronisere budsjettet',
    signOut: 'Logg ut',
    includeExtraordinary: 'Inkluder ekstraordinære',
    netCashflow: 'Netto kontantstrøm',
    income: 'Inntekt',
    expenses: 'Utgifter',
    expenseDistribution: 'Utgiftsfordeling',
    categoryTotals: 'Kategoritotaler',
    overview: 'Oversikt',
    breakdown: 'Detaljer',
    add: 'Legg til',
    cancel: 'Avbryt',
    logPurchase: 'Logg kjøp',
    lockEstimate: 'Lås estimat',
    addCategory: 'Legg til kategori',
    addItem: 'Legg til post',
    fixedAmount: 'Fast beløp',
    trackToLearn: 'Spor for å lære',
    extra: 'Ekstra',
    daily: 'Daglig',
    weekly: 'Ukentlig',
    monthly: 'Månedlig',
    yearly: 'Årlig',
    waitingForPurchase: 'Venter på neste kjøp for å estimere',
    tracking: 'sporing',
    extraordinary: 'ekstraordinær',
    waitingForData: 'Venter på data',
    ofIncome: 'av inntekt',
    ofExpenses: 'av utgifter',
    basedOn: (count, days) => `basert på ${count} kjøp, snitt ${days} dager mellom`,
    categoryNamePlaceholder: 'Kategorinavn...',
    amount: 'Beløp',
    toggleExtraordinaryTitle: 'Veksle ekstraordinær (Ekskluder fra kjernebudsjett)',
    error: 'Feil',
    byCategory: 'Kategori',
    byItem: 'Poster',
    other: 'Andre',
    continueWithout: 'Fortsett uten konto',
    guestBanner: 'Du bruker gjeste-modus. Data lagres lokalt i nettleseren.',
    guestSignIn: 'Logg inn',
    guest: 'Gjest',
    googleDataInfo: 'Lagres sikkert i skyen — tilgjengelig fra alle enheter',
    guestDataInfo: 'Lagres lokalt i nettleseren — forsvinner om du sletter nettleserdata',
    trends: 'Trender',
    incomeVsExpenses: 'Inntekt vs. Utgifter',
    byExpenseCategory: 'Per kategori',
    cumulative: 'Kumulativ',
    range3m: '3M',
    range6m: '6M',
    range12m: '12M',
    rangeAll: 'Alle',
    now: 'Nå',
    projected: 'Fremskrevet',
    showMovingAvg: 'Vis glidende snitt',
    noTrendsData: 'Legg til poster for å se trender',
    net: 'Netto',
    monthNames: ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'],
  },
  en: {
    budgetOverview: 'Budget Overview',
    subtitle: 'Every krone, accounted for',
    signInWithGoogle: 'Sign in with Google',
    signInToSync: 'Sign in to sync your budget',
    signOut: 'Sign out',
    includeExtraordinary: 'Include Extraordinary',
    netCashflow: 'Net Cashflow',
    income: 'Income',
    expenses: 'Expenses',
    expenseDistribution: 'Expense Distribution',
    categoryTotals: 'Category Totals',
    overview: 'Overview',
    breakdown: 'Breakdown',
    add: 'Add',
    cancel: 'Cancel',
    logPurchase: 'Log Purchase',
    lockEstimate: 'Lock estimate',
    addCategory: 'Add Category',
    addItem: 'Add item',
    fixedAmount: 'Fixed amount',
    trackToLearn: 'Track to learn',
    extra: 'Extra',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    yearly: 'Yearly',
    waitingForPurchase: 'Waiting for next purchase to estimate',
    tracking: 'tracking',
    extraordinary: 'extraordinary',
    waitingForData: 'Waiting for data',
    ofIncome: 'of income',
    ofExpenses: 'of expenses',
    basedOn: (count, days) => `based on ${count} purchases, avg ${days} days apart`,
    categoryNamePlaceholder: 'Category name...',
    amount: 'Amount',
    toggleExtraordinaryTitle: 'Toggle Extraordinary (Exclude from core budget)',
    error: 'Error',
    byCategory: 'Category',
    byItem: 'Items',
    other: 'Other',
    continueWithout: 'Continue without account',
    guestBanner: 'You are using guest mode. Data is saved locally in your browser.',
    guestSignIn: 'Sign in',
    guest: 'Guest',
    googleDataInfo: 'Stored securely in the cloud — accessible from any device',
    guestDataInfo: 'Stored locally in your browser — lost if you clear browser data',
    trends: 'Trends',
    incomeVsExpenses: 'Income vs. Expenses',
    byExpenseCategory: 'By Category',
    cumulative: 'Cumulative',
    range3m: '3M',
    range6m: '6M',
    range12m: '12M',
    rangeAll: 'All',
    now: 'Now',
    projected: 'Projected',
    showMovingAvg: 'Show moving average',
    noTrendsData: 'Add items to see trends',
    net: 'Net',
    monthNames: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  },
};

const LanguageContext = createContext();

const VALID_LANGS = ['no', 'en'];

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem('budget-lang');
    return VALID_LANGS.includes(stored) ? stored : 'no';
  });

  const setLang = useCallback((l) => {
    if (!VALID_LANGS.includes(l)) return;
    setLangState(l);
    localStorage.setItem('budget-lang', l);
  }, []);

  const t = translations[lang] || translations.no;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
