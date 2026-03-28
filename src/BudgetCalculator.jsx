import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { db, auth } from './firebase.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  PieChart, Pie, Cell, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import {
  ChevronDown, ChevronRight, Trash2, X, Plus, TrendingUp,
  Lock, BarChart3, PieChart as PieIcon, Wallet, CalendarDays,
} from 'lucide-react';
import { useTranslation } from './i18n.jsx';
import {
  FREQ_MULTIPLIERS, FREQS, annualize, fromYearly, formatNOK,
  uid, getCatColor, getItemColor, computeTracking, trackingYearly, itemYearly, bestFrequency,
  buildTimeSeries, MAX_NAME_LENGTH, MAX_AMOUNT, GUEST_MAX_BYTES,
} from './helpers.js';
import CategorySection from './components/CategorySection.jsx';
import TrendsChart from './components/TrendsChart.jsx';
import './BudgetCalculator.css';

// ─── Default data ────────────────────────────────────────────

const defaultCategories = () => [
  {
    id: uid(), name: 'Income', collapsed: false, isIncome: true, items: [],
  },
  {
    id: uid(), name: 'Necessities', collapsed: false, items: [
      { id: uid(), name: 'Rent', amount: 12000, frequency: 'monthly', mode: 'fixed' },
      { id: uid(), name: 'Electricity', amount: 800, frequency: 'monthly', mode: 'fixed' },
      { id: uid(), name: 'Internet', amount: 499, frequency: 'monthly', mode: 'fixed' },
      { id: uid(), name: 'Phone Plan', amount: 349, frequency: 'monthly', mode: 'fixed' },
      { id: uid(), name: 'Groceries', amount: 4000, frequency: 'monthly', mode: 'fixed' },
      { id: uid(), name: 'Home Insurance', amount: 3600, frequency: 'yearly', mode: 'fixed' },
    ],
  },
  {
    id: uid(), name: 'Entertainment', collapsed: false, items: [
      { id: uid(), name: 'Netflix', amount: 169, frequency: 'monthly', mode: 'fixed' },
      { id: uid(), name: 'Spotify', amount: 119, frequency: 'monthly', mode: 'fixed' },
      { id: uid(), name: 'Going out avg', amount: 500, frequency: 'weekly', mode: 'fixed' },
    ],
  },
  {
    id: uid(), name: 'Savings & Investments', collapsed: false, items: [
      { id: uid(), name: 'Index Fund', amount: 3000, frequency: 'monthly', mode: 'fixed' },
      { id: uid(), name: 'Emergency Fund', amount: 1000, frequency: 'monthly', mode: 'fixed' },
    ],
  },
  {
    id: uid(), name: 'Transportation', collapsed: false, items: [
      { id: uid(), name: 'Monthly Bus Pass', amount: 750, frequency: 'monthly', mode: 'fixed' },
    ],
  },
];

// Ensure Income category exists (for existing localStorage data)
const ensureIncome = (cats) => {
  if (!cats.some(c => c.isIncome)) {
    return [{ id: uid(), name: 'Income', collapsed: false, isIncome: true, items: [] }, ...cats];
  }
  return cats;
};

// ═══════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const GUEST_STORAGE_KEY = 'budget-guest-data';

export default function BudgetCalculator({ user, onSignIn }) {
  const isGuest = !user;
  const [categories, setCategories] = useState([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [viewFreq, setViewFreq] = useState('monthly');
  const [activeTab, setActiveTab] = useState('overview');
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [showExtraordinary, setShowExtraordinary] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [pieMode, setPieMode] = useState('category');
  const [trendsRange, setTrendsRange] = useState(12);

  const { lang, setLang, t } = useTranslation();
  const FREQ_LABELS = { daily: t.daily, weekly: t.weekly, monthly: t.monthly, yearly: t.yearly };

  // ─── Data Load ──────────────────────────────

  useEffect(() => {
    if (isGuest) {
      try {
        const saved = localStorage.getItem(GUEST_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const safeData = parsed.map(c => ({ ...c, items: c.items || [] }));
          setCategories(ensureIncome(safeData));
        } else {
          setCategories(defaultCategories());
        }
      } catch (e) {
        console.error("Error loading guest data:", e);
        setCategories(defaultCategories());
      }
      setLoadingDb(false);
      return;
    }
    const fetchBudget = async () => {
      try {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().categories) {
          const safeData = docSnap.data().categories.map(c => ({ ...c, items: c.items || [] }));
          setCategories(ensureIncome(safeData));
        } else {
          setCategories(defaultCategories());
        }
      } catch (e) {
        console.error("Error fetching budget:", e);
        setCategories(defaultCategories());
      }
      setLoadingDb(false);
    };
    fetchBudget();
  }, [user, isGuest]);

  // ─── Derived data ─────────────────────────────────────────

  const catTotals = useMemo(() =>
    categories.map(cat => {
      const yearly = (cat.items || []).reduce((s, it) => {
        if (!showExtraordinary && it.isExtraordinary) return s;
        return s + itemYearly(it);
      }, 0);
      return { id: cat.id, name: cat.name, yearly, view: fromYearly(yearly, viewFreq), isIncome: !!cat.isIncome };
    }),
    [categories, viewFreq, showExtraordinary]
  );

  const incomeYearly = useMemo(() => catTotals.filter(c => c.isIncome).reduce((s, c) => s + c.yearly, 0), [catTotals]);
  const expenseYearly = useMemo(() => catTotals.filter(c => !c.isIncome).reduce((s, c) => s + c.yearly, 0), [catTotals]);
  const netYearly = useMemo(() => incomeYearly - expenseYearly, [incomeYearly, expenseYearly]);

  const expenseCatTotals = useMemo(() => catTotals.filter(c => !c.isIncome), [catTotals]);
  const incomeCatTotals = useMemo(() => catTotals.filter(c => c.isIncome), [catTotals]);

  const hasTracking = useMemo(() =>
    categories.some(c => c.items.some(i => i.mode === 'tracking' && !i.locked && (showExtraordinary || !i.isExtraordinary))),
    [categories, showExtraordinary]
  );

  const itemPieData = useMemo(() => {
    const MAX_SLICES = 10;
    const allItems = [];
    categories.filter(c => !c.isIncome).forEach(cat => {
      (cat.items || []).forEach(item => {
        if (!showExtraordinary && item.isExtraordinary) return;
        const yearly = itemYearly(item);
        const view = fromYearly(yearly, viewFreq);
        if (view > 0) {
          allItems.push({ id: item.id, name: item.name, view, catName: cat.name });
        }
      });
    });
    allItems.sort((a, b) => b.view - a.view);
    if (allItems.length <= MAX_SLICES) return allItems;
    const top = allItems.slice(0, MAX_SLICES);
    const otherView = allItems.slice(MAX_SLICES).reduce((s, i) => s + i.view, 0);
    top.push({ id: '__other__', name: t.other, view: otherView, catName: '__other__' });
    return top;
  }, [categories, viewFreq, showExtraordinary, t.other]);

  const timeSeries = useMemo(() =>
    buildTimeSeries(categories, trendsRange, showExtraordinary),
    [categories, trendsRange, showExtraordinary]
  );

  // ─── Mutators ─────────────────────────────────────────────

  const syncTimer = useRef(null);

  const updateCategories = useCallback((fn) => {
    setCategories(prev => {
      const next = fn([...prev.map(c => ({ ...c, items: [...c.items.map(i => ({ ...i }))] }))]);

      if (isGuest) {
        try {
          const serialized = JSON.stringify(next);
          if (serialized.length > GUEST_MAX_BYTES) {
            setSyncError(true);
          } else {
            localStorage.setItem(GUEST_STORAGE_KEY, serialized);
            setSyncError(false);
          }
        } catch (e) {
          if (e.name === 'QuotaExceededError') setSyncError(true);
          else console.error("Error saving guest data:", e);
        }
      } else if (user) {
        // Debounce Firestore writes — wait 500ms of inactivity before saving
        if (syncTimer.current) clearTimeout(syncTimer.current);
        const snapshot = prev;
        syncTimer.current = setTimeout(() => {
          setDoc(doc(db, 'users', user.uid), { categories: next }, { merge: true })
            .then(() => setSyncError(false))
            .catch((e) => {
              console.error(e);
              setSyncError(true);
              setCategories(snapshot);
            });
        }, 500);
      }

      return next;
    });
  }, [user, isGuest]);

  const toggleCollapse = useCallback((catId) => {
    updateCategories(cats => { const c = cats.find(c => c.id === catId); if (c) c.collapsed = !c.collapsed; return cats; });
  }, [updateCategories]);

  const deleteCategory = useCallback((catId) => {
    updateCategories(cats => cats.filter(c => c.id !== catId || c.isIncome));
  }, [updateCategories]);

  const addCategory = useCallback(() => {
    const name = newCatName.trim().slice(0, MAX_NAME_LENGTH);
    if (!name) return;
    updateCategories(cats => [...cats, { id: uid(), name, collapsed: false, items: [] }]);
    setNewCatName('');
    setShowNewCat(false);
  }, [newCatName, updateCategories]);

  const addItem = useCallback((catId, mode) => {
    updateCategories(cats => {
      const c = cats.find(c => c.id === catId);
      if (!c) return cats;
      if (mode === 'fixed') {
        c.items.push({ id: uid(), name: 'New Item', amount: 0, frequency: 'monthly', mode: 'fixed', isNew: true });
      } else {
        c.items.push({ id: uid(), name: 'New Item', mode: 'tracking', purchases: [], locked: false, isNew: true });
      }
      return cats;
    });
  }, [updateCategories]);

  const deleteItem = useCallback((catId, itemId) => {
    updateCategories(cats => {
      const c = cats.find(c => c.id === catId);
      if (c) c.items = c.items.filter(i => i.id !== itemId);
      return cats;
    });
  }, [updateCategories]);

  const ALLOWED_ITEM_FIELDS = ['name', 'amount', 'frequency', 'isExtraordinary', 'isNew'];
  const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly'];

  const updateItem = useCallback((catId, itemId, field, value) => {
    if (!ALLOWED_ITEM_FIELDS.includes(field)) return;
    updateCategories(cats => {
      const c = cats.find(c => c.id === catId);
      if (!c) return cats;
      const item = c.items.find(i => i.id === itemId);
      if (!item) return cats;
      if (field === 'amount') {
        const parsed = parseFloat(value);
        item.amount = (!Number.isFinite(parsed) || parsed < 0) ? 0 : Math.min(parsed, MAX_AMOUNT);
      } else if (field === 'name') {
        item.name = String(value).slice(0, MAX_NAME_LENGTH);
      } else if (field === 'frequency') {
        if (VALID_FREQUENCIES.includes(value)) item.frequency = value;
      } else {
        item[field] = value;
      }
      return cats;
    });
  }, [updateCategories]);

  const logPurchase = useCallback((catId, itemId, date, amount) => {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return;
    const parsedAmount = parseFloat(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > MAX_AMOUNT) return;
    updateCategories(cats => {
      const c = cats.find(c => c.id === catId);
      if (!c) return cats;
      const item = c.items.find(i => i.id === itemId);
      if (item && item.mode === 'tracking') {
        item.purchases = [...(item.purchases || []), { id: uid(), date, amount: parsedAmount }];
      }
      return cats;
    });
  }, [updateCategories]);

  const deletePurchase = useCallback((catId, itemId, purchaseId) => {
    updateCategories(cats => {
      const c = cats.find(c => c.id === catId);
      if (!c) return cats;
      const item = c.items.find(i => i.id === itemId);
      if (item && item.mode === 'tracking') {
        item.purchases = item.purchases.filter(p => p.id !== purchaseId);
      }
      return cats;
    });
  }, [updateCategories]);

  const lockItem = useCallback((catId, itemId) => {
    updateCategories(cats => {
      const c = cats.find(c => c.id === catId);
      if (!c) return cats;
      const item = c.items.find(i => i.id === itemId);
      if (!item || item.mode !== 'tracking') return cats;
      const { inferredIntervalDays, averageAmount } = computeTracking(item.purchases);
      if (inferredIntervalDays == null) return cats;
      const freq = bestFrequency(inferredIntervalDays);
      const amount = fromYearly((averageAmount / inferredIntervalDays) * 365, freq);
      const idx = c.items.indexOf(item);
      c.items[idx] = { id: item.id, name: item.name, mode: 'fixed', amount: Math.round(amount), frequency: freq };
      return cats;
    });
  }, [updateCategories]);

  // ─── Render ────────────────────────────────────────────────

  if (loadingDb) return <div style={{ height: '100vh', background: 'var(--color-bg, #0d0d0d)' }}></div>;

  const expensesWithValues = expenseCatTotals.filter(c => c.view > 0);

  return (
    <div className="bc-root">
      {/* ── Header ──────────────────────── */}
      <header className="bc-header">
        <div className="bc-header-left">
          <div className="bc-logo"><Wallet size={20} color="#e8e8e8" /></div>
          <div>
            <h1>{t.budgetOverview}</h1>
            <div className="subtitle">
              {t.subtitle} <span className="dot">•</span>
              {isGuest ? (
                <>
                  <span>{t.guest}</span>
                  {onSignIn && <button className="bc-header-link sign-in" onClick={onSignIn}>{t.guestSignIn}</button>}
                </>
              ) : (
                <>
                  <span>{user?.email}</span>
                  <button className="bc-header-link sign-out" onClick={() => signOut(auth)}>{t.signOut}</button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="bc-header-right">
          <div className="bc-lang-toggle" role="radiogroup" aria-label="Language">
            <button className={`bc-lang-btn ${lang === 'no' ? 'active' : ''}`} onClick={() => setLang('no')} role="radio" aria-checked={lang === 'no'}>NO</button>
            <button className={`bc-lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')} role="radio" aria-checked={lang === 'en'}>EN</button>
          </div>
          <div className="bc-header-sep" />
          <div className="bc-freq-toggle" role="radiogroup" aria-label="View frequency">
            {FREQS.map(f => (
              <button
                key={f}
                className={`bc-freq-btn ${viewFreq === f ? 'active' : ''}`}
                onClick={() => setViewFreq(f)}
                role="radio"
                aria-checked={viewFreq === f}
              >{FREQ_LABELS[f]}</button>
            ))}
          </div>
        </div>
      </header>

      {syncError && (
        <div className="bc-sync-error" role="alert">
          {lang === 'no' ? 'Endringer kunne ikke lagres. Sjekk tilkoblingen din.' : 'Changes could not be saved. Check your connection.'}
        </div>
      )}

      {isGuest && (
        <div className="bc-guest-banner">
          {t.guestBanner}
          {onSignIn && <button onClick={onSignIn}>{t.guestSignIn}</button>}
        </div>
      )}

      <main className="bc-main">
        {/* ── Grand Total ─────────────── */}
        <div className="bc-grand">
          <div className="bc-grand-label">{t.netCashflow} • {FREQ_LABELS[viewFreq]}</div>
          <div className="bc-grand-value bc-mono" style={{ color: netYearly >= 0 ? 'var(--color-accent)' : 'var(--color-danger)' }}>
            {netYearly >= 0 ? '+' : '−'}{formatNOK(Math.abs(fromYearly(netYearly, viewFreq)))}
          </div>
          <div className="bc-grand-split">
            <span className="confirmed">{t.income}: <span className="bc-mono">{formatNOK(fromYearly(incomeYearly, viewFreq))}</span></span>
            <span className="projected">{t.expenses}: <span className="bc-mono">−{formatNOK(fromYearly(expenseYearly, viewFreq))}</span></span>
          </div>
        </div>

        {/* ── Tabs ────────────────────── */}
        <div className="bc-tabs" role="tablist">
          <button className={`bc-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')} role="tab" aria-selected={activeTab === 'overview'}>
            <PieIcon size={15} /> {t.overview}
          </button>
          <button className={`bc-tab ${activeTab === 'breakdown' ? 'active' : ''}`} onClick={() => setActiveTab('breakdown')} role="tab" aria-selected={activeTab === 'breakdown'}>
            <BarChart3 size={15} /> {t.breakdown}
          </button>
          <button className={`bc-tab ${activeTab === 'trends' ? 'active' : ''}`} onClick={() => setActiveTab('trends')} role="tab" aria-selected={activeTab === 'trends'}>
            <TrendingUp size={15} /> {t.trends}
          </button>
        </div>

        {/* ── Filter bar ──────────────── */}
        <div className="bc-tab-filter">
          <label className="bc-extra-check" style={{ color: showExtraordinary ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
            <input type="checkbox" checked={showExtraordinary} onChange={e => setShowExtraordinary(e.target.checked)} />
            {t.includeExtraordinary}
          </label>
        </div>

        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === 'overview' && (
          <>
            <div className="bc-overview-grid">
              {/* Pie Chart */}
              <div className="bc-card">
                <div className="bc-card-title" style={{ justifyContent: 'space-between' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><PieIcon size={14} /> {t.expenseDistribution}</span>
                  <div className="bc-freq-toggle bc-pie-toggle" role="radiogroup" aria-label="Pie chart mode">
                    <button className={`bc-freq-btn ${pieMode === 'category' ? 'active' : ''}`} onClick={() => setPieMode('category')} role="radio" aria-checked={pieMode === 'category'}>{t.byCategory}</button>
                    <button className={`bc-freq-btn ${pieMode === 'item' ? 'active' : ''}`} onClick={() => setPieMode('item')} role="radio" aria-checked={pieMode === 'item'}>{t.byItem}</button>
                  </div>
                </div>
                {(() => {
                  const pieData = pieMode === 'category' ? expensesWithValues : itemPieData;
                  return (
                    <div className="bc-chart-wrap">
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="view"
                              nameKey="name"
                              cx="50%" cy="50%"
                              innerRadius={60} outerRadius={100}
                              paddingAngle={2}
                              stroke="none"
                            >
                              {pieData.map((d, i) => (
                                <Cell key={d.id} fill={pieMode === 'item' ? getItemColor(i, pieData.length) : getCatColor(d.name)} />
                              ))}
                            </Pie>
                            <ReTooltip
                              contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                              formatter={(v, name) => [formatNOK(v), name]}
                              labelStyle={{ color: '#ccc' }}
                              itemStyle={{ color: '#52B788' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="bc-empty-state">{lang === 'no' ? 'Ingen utgifter enda' : 'No expenses yet'}</div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Bar Chart */}
              <div className="bc-card">
                <div className="bc-card-title"><BarChart3 size={14} /> {t.categoryTotals} • {FREQ_LABELS[viewFreq]}</div>
                <div className="bc-chart-wrap">
                  {expensesWithValues.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={expensesWithValues} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={120} tick={{ fill: '#999', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <ReTooltip
                          contentStyle={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                          formatter={(v, name) => [formatNOK(v), name]}
                          labelStyle={{ color: '#ccc' }}
                          itemStyle={{ color: '#52B788' }}
                        />
                        <Bar dataKey="view" radius={[0, 6, 6, 0]}>
                          {expensesWithValues.map(c => (
                            <Cell key={c.id} fill={getCatColor(c.name)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="bc-empty-state">{lang === 'no' ? 'Ingen utgifter enda' : 'No expenses yet'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="bc-summary-grid">
              {catTotals.map(ct => {
                const cat = categories.find(c => c.id === ct.id);
                const refTotal = ct.isIncome ? incomeYearly : expenseYearly;
                const pct = refTotal > 0 ? ((ct.yearly / refTotal) * 100).toFixed(1) : '0.0';
                return (
                  <div key={ct.id} className="bc-summary-card" style={{ '--cat-color': getCatColor(ct.name) }}>
                    <div className="bc-summary-card-name">{ct.name}</div>
                    <div className="bc-summary-card-pct">{pct}% {ct.isIncome ? t.ofIncome : t.ofExpenses}</div>
                    <div className="bc-summary-card-total bc-mono">{ct.isIncome ? '+' : ''}{formatNOK(ct.view)}</div>
                    <div className="bc-summary-card-subs">
                      {FREQS.filter(f => f !== viewFreq).map(f => (
                        <span key={f}>{FREQ_LABELS[f]}: <span className="bc-mono">{formatNOK(fromYearly(ct.yearly, f))}</span>  </span>
                      ))}
                    </div>
                    <div className="bc-summary-card-items">
                      {cat.items.filter(i => showExtraordinary || !i.isExtraordinary).map(item => {
                        const iy = itemYearly(item);
                        const iv = fromYearly(iy, viewFreq);
                        const isTrack = item.mode === 'tracking';
                        const hasSuffix = isTrack && (!item.purchases || item.purchases.length < 2);
                        return (
                          <div key={item.id} className="bc-summary-item">
                            <span className="bc-summary-item-name">
                              {item.name}
                              {isTrack && <span className="bc-tracking-badge">{t.tracking}</span>}
                              {item.isExtraordinary && <span className="bc-tracking-badge" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>{t.extraordinary}</span>}
                            </span>
                            <span className="bc-summary-item-val bc-mono">
                              {hasSuffix ? t.waitingForData : (isTrack ? '~' : '') + formatNOK(iv)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ═══ BREAKDOWN TAB ═══ */}
        {activeTab === 'breakdown' && (
          <>
            {categories.map(cat => (
              <CategorySection
                key={cat.id}
                cat={cat}
                viewFreq={viewFreq}
                catTotal={catTotals.find(c => c.id === cat.id)?.view || 0}
                toggleCollapse={toggleCollapse}
                deleteCategory={deleteCategory}
                addItem={addItem}
                deleteItem={deleteItem}
                updateItem={updateItem}
                logPurchase={logPurchase}
                deletePurchase={deletePurchase}
                lockItem={lockItem}
              />
            ))}

            {/* Add category */}
            {showNewCat ? (
              <div className="bc-new-cat-form">
                <input
                  autoFocus
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                  placeholder={t.categoryNamePlaceholder}
                  aria-label={t.categoryNamePlaceholder}
                />
                <button className="bc-small-btn green" onClick={addCategory}>{t.add}</button>
                <button className="bc-small-btn" onClick={() => { setShowNewCat(false); setNewCatName(''); }}>{t.cancel}</button>
              </div>
            ) : (
              <button className="bc-add-btn" onClick={() => setShowNewCat(true)}>
                <Plus size={14} /> {t.addCategory}
              </button>
            )}
          </>
        )}

        {/* ═══ TRENDS TAB ═══ */}
        {activeTab === 'trends' && (
          <TrendsChart
            timeSeriesData={timeSeries.data}
            expenseCategories={timeSeries.expenseCategories}
          />
        )}
      </main>
    </div>
  );
}
