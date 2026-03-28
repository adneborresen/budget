// ─── Frequency ──────────────────────────────────────────────

export const FREQ_MULTIPLIERS = { daily: 365, weekly: 52, monthly: 12, yearly: 1 };
export const FREQS = ['daily', 'weekly', 'monthly', 'yearly'];

export const annualize = (amount, freq) => amount * FREQ_MULTIPLIERS[freq];
export const fromYearly = (yearly, freq) => Math.round((yearly / FREQ_MULTIPLIERS[freq]) * 100) / 100;

// ─── Formatting ─────────────────────────────────────────────

export const formatNOK = (n) => {
  if (n == null || isNaN(n)) return '0 kr';
  return n.toLocaleString('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' kr';
};

// ─── Limits ─────────────────────────────────────────────────

export const MAX_NAME_LENGTH = 100;
export const MAX_AMOUNT = 999_999_999;
export const GUEST_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

// ─── ID generation ──────────────────────────────────────────

export const uid = () => crypto.randomUUID();

// ─── Colors ─────────────────────────────────────────────────

const CATEGORY_COLORS = {
  'Income':                '#52B788',   // green
  'Necessities':           '#E07A5F',   // coral
  'Entertainment':         '#7B68EE',   // medium slate blue
  'Savings & Investments': '#3D9BE9',   // bright blue
  'Transportation':        '#F4A261',   // sandy orange
  'Health & Fitness':      '#E9C46A',   // gold
  'Subscriptions':         '#A06CD5',   // purple
  'Food & Dining':         '#E76F51',   // burnt orange
  'Other':                 '#8D99AE',   // cool grey
};

const hashColor = (name) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
};

export const getCatColor = (name) => CATEGORY_COLORS[name] || hashColor(name);

// Golden-angle based palette for N items — maximally distinct at any count
const GOLDEN_ANGLE = 137.508;

export function getItemColor(index, total) {
  const hue = (index * GOLDEN_ANGLE) % 360;
  const saturation = 55 + (index % 3) * 10;  // 55, 65, 75 — vary saturation
  const lightness = 45 + (index % 2) * 10;   // 45, 55 — vary lightness
  return `hsl(${Math.round(hue)}, ${saturation}%, ${lightness}%)`;
}

// ─── Tracking inference ─────────────────────────────────────

export function computeTracking(purchases) {
  if (!purchases || purchases.length < 2) return { inferredIntervalDays: null, averageAmount: null };
  const sorted = [...purchases].sort((a, b) => new Date(a.date) - new Date(b.date));
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24);
    intervals.push(diff);
  }
  const inferredIntervalDays = intervals.reduce((s, v) => s + v, 0) / intervals.length;
  const averageAmount = sorted.reduce((s, p) => s + p.amount, 0) / sorted.length;
  return { inferredIntervalDays, averageAmount };
}

export function trackingYearly(item) {
  const { inferredIntervalDays, averageAmount } = computeTracking(item.purchases);
  if (inferredIntervalDays == null || inferredIntervalDays <= 0) return 0;
  return (averageAmount / inferredIntervalDays) * 365;
}

export function itemYearly(item) {
  if (item.mode === 'fixed') return annualize(item.amount, item.frequency);
  return trackingYearly(item);
}

export function bestFrequency(intervalDays) {
  if (intervalDays <= 3) return 'daily';
  if (intervalDays <= 14) return 'weekly';
  if (intervalDays <= 90) return 'monthly';
  return 'yearly';
}

// ─── Time-series helpers ────────────────────────────────────

const MONTH_NAMES_NO = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function getMonthLabel(dateKey, lang) {
  const month = parseInt(dateKey.split('-')[1], 10) - 1;
  return lang === 'no' ? MONTH_NAMES_NO[month] : MONTH_NAMES_EN[month];
}

export function buildTimeSeries(categories, monthCount, showExtraordinary) {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Collect all tracking purchase dates to find earliest
  let earliestDate = now;
  categories.forEach(cat => {
    (cat.items || []).forEach(item => {
      if (item.mode === 'tracking' && item.purchases) {
        item.purchases.forEach(p => {
          const d = new Date(p.date);
          if (d < earliestDate) earliestDate = d;
        });
      }
    });
  });

  // Determine start month
  let startDate;
  if (monthCount === 'all') {
    startDate = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth() - monthCount, 1);
  }
  // Don't go earlier than earliest data
  const dataStart = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  if (startDate > dataStart && monthCount !== 'all') {
    // keep startDate as is
  } else if (monthCount !== 'all') {
    startDate = new Date(now.getFullYear(), now.getMonth() - monthCount, 1);
  }

  // End date: 3 months into the future
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 1);

  // Build month keys
  const monthKeys = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthKeys.push(key);
    d.setMonth(d.getMonth() + 1);
  }

  // Collect expense categories (non-income) for stacked view
  const expenseCategories = categories
    .filter(c => !c.isIncome)
    .map(c => ({ id: c.id, name: c.name, color: getCatColor(c.name) }));

  // Initialize buckets
  const buckets = monthKeys.map(key => {
    const bucket = { key, income: 0, expenses: 0, net: 0, cumulative: 0, isFuture: key > currentKey };
    expenseCategories.forEach(ec => { bucket[`cat_${ec.id}`] = 0; });
    return bucket;
  });

  const bucketMap = {};
  buckets.forEach(b => { bucketMap[b.key] = b; });

  // Fill buckets
  categories.forEach(cat => {
    const isIncome = !!cat.isIncome;
    (cat.items || []).forEach(item => {
      if (!showExtraordinary && item.isExtraordinary) return;

      if (item.mode === 'fixed') {
        // Fixed items: distribute monthly amount into every bucket
        const monthlyAmount = fromYearly(annualize(item.amount, item.frequency), 'monthly');
        buckets.forEach(b => {
          if (isIncome) {
            b.income += monthlyAmount;
          } else {
            b.expenses += monthlyAmount;
            if (bucketMap[b.key]) b[`cat_${cat.id}`] = (b[`cat_${cat.id}`] || 0) + monthlyAmount;
          }
        });
      } else if (item.mode === 'tracking') {
        // Past: bucket each purchase by its month
        if (item.purchases) {
          item.purchases.forEach(p => {
            const pDate = new Date(p.date);
            const pKey = `${pDate.getFullYear()}-${String(pDate.getMonth() + 1).padStart(2, '0')}`;
            if (bucketMap[pKey]) {
              if (isIncome) {
                bucketMap[pKey].income += p.amount;
              } else {
                bucketMap[pKey].expenses += p.amount;
                bucketMap[pKey][`cat_${cat.id}`] = (bucketMap[pKey][`cat_${cat.id}`] || 0) + p.amount;
              }
            }
          });
        }
        // Future: use projected monthly amount
        const monthlyProjection = trackingYearly(item) / 12;
        if (monthlyProjection > 0) {
          buckets.forEach(b => {
            if (!b.isFuture) return;
            if (isIncome) {
              b.income += monthlyProjection;
            } else {
              b.expenses += monthlyProjection;
              b[`cat_${cat.id}`] = (b[`cat_${cat.id}`] || 0) + monthlyProjection;
            }
          });
        }
      }
    });
  });

  // Derive net, cumulative, moving average
  let cumulative = 0;
  buckets.forEach((b, i) => {
    b.income = Math.round(b.income);
    b.expenses = Math.round(b.expenses);
    expenseCategories.forEach(ec => { b[`cat_${ec.id}`] = Math.round(b[`cat_${ec.id}`] || 0); });
    b.net = b.income - b.expenses;
    cumulative += b.net;
    b.cumulative = cumulative;

    // 3-month rolling average of net
    if (i >= 2) {
      b.movingAvgNet = Math.round((buckets[i].net + buckets[i - 1].net + buckets[i - 2].net) / 3);
    } else {
      b.movingAvgNet = b.net;
    }
  });

  return { data: buckets, expenseCategories };
}
