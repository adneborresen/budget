import React, { useState, useEffect } from 'react';
import BudgetCalculator from './BudgetCalculator.jsx';
import { auth, googleProvider } from './firebase.js';
import { onAuthStateChanged, signInWithPopup } from 'firebase/auth';
import { LanguageProvider, useTranslation } from './i18n.jsx';

class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error, info) { console.error('App crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: '#E07A5F', background: '#0d0d0d', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif', textAlign: 'center', padding: '40px' }}>
          <div>
            <h2 style={{ marginBottom: '12px' }}>Something went wrong</h2>
            <p style={{ color: '#999', fontSize: '14px', marginBottom: '20px' }}>An unexpected error occurred.</p>
            <button onClick={() => window.location.reload()} style={{ background: '#2D6A4F', color: '#e8e8e8', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontFamily: 'DM Sans, sans-serif' }}>
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [user, setUser] = useState(null);
  const [guestMode, setGuestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const { lang, setLang, t } = useTranslation();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async () => {
    setAuthError(null);
    try {
      setGuestMode(false);
      await signInWithPopup(auth, googleProvider);
    }
    catch (e) { setAuthError(e.message); }
  };

  if (loading) return <div style={{height: '100vh', background: '#0d0d0d'}}></div>;

  if (user) return <BudgetCalculator user={user} />;
  if (guestMode) return <BudgetCalculator user={null} onSignIn={login} />;

  return (
    <div className="bc-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0d0d0d' }}>
      <div className="bc-card" style={{ textAlign: 'center', padding: '40px', maxWidth: '360px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0', marginBottom: '20px' }}>
          <button
            onClick={() => setLang('no')}
            style={{
              padding: '4px 10px', fontSize: '11px', fontWeight: 600,
              background: lang === 'no' ? '#2D6A4F' : '#141414',
              color: lang === 'no' ? '#e8e8e8' : '#888',
              border: '1px solid #262626', borderRight: 'none',
              borderRadius: '6px 0 0 6px', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s ease',
            }}
          >NO</button>
          <button
            onClick={() => setLang('en')}
            style={{
              padding: '4px 10px', fontSize: '11px', fontWeight: 600,
              background: lang === 'en' ? '#2D6A4F' : '#141414',
              color: lang === 'en' ? '#e8e8e8' : '#888',
              border: '1px solid #262626',
              borderRadius: '0 6px 6px 0', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s ease',
            }}
          >EN</button>
        </div>
        <h2 style={{ fontFamily: 'DM Sans', color: '#e8e8e8', marginBottom: '8px', fontSize: '24px' }}>{t.budgetOverview}</h2>
        <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>{t.signInToSync}</p>
        {authError && <div style={{ background: 'rgba(224,122,95,0.1)', color: '#E07A5F', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '24px', textAlign: 'left' }}>{t.error}: {authError}</div>}
        <button onClick={login} style={{
          background: '#e8e8e8', color: '#111', border: 'none', padding: '12px 20px',
          borderRadius: '8px', fontFamily: 'DM Sans', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', width: '100%', justifyContent: 'center',
          transition: 'background 0.2s'
        }} onMouseOver={e => e.currentTarget.style.background = '#d0d0d0'} onMouseOut={e => e.currentTarget.style.background = '#e8e8e8'}>
          <svg width="18" height="18" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          {t.signInWithGoogle}
        </button>
        <p style={{ color: '#666', fontSize: '11px', margin: '6px 0 0', lineHeight: '1.4' }}>{t.googleDataInfo}</p>
        <button onClick={() => setGuestMode(true)} style={{
          background: 'none', color: '#888', border: '1px solid #262626', padding: '10px 20px',
          borderRadius: '8px', fontFamily: 'DM Sans', fontSize: '13px', cursor: 'pointer',
          width: '100%', marginTop: '16px', transition: 'all 0.2s'
        }} onMouseOver={e => { e.currentTarget.style.borderColor = '#52B788'; e.currentTarget.style.color = '#ccc'; }}
           onMouseOut={e => { e.currentTarget.style.borderColor = '#262626'; e.currentTarget.style.color = '#888'; }}>
          {t.continueWithout}
        </button>
        <p style={{ color: '#666', fontSize: '11px', margin: '6px 0 0', lineHeight: '1.4' }}>{t.guestDataInfo}</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
