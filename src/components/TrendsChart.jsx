import React, { useState } from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { useTranslation } from '../i18n.jsx';
import { formatNOK, getMonthLabel } from '../helpers.js';

const VIEW_MODES = ['incomeVsExpenses', 'byExpenseCategory', 'cumulative'];
const RANGES = [
  { key: 3, label: 'range3m' },
  { key: 6, label: 'range6m' },
  { key: 12, label: 'range12m' },
  { key: 'all', label: 'rangeAll' },
];

export default function TrendsChart({ timeSeriesData, expenseCategories }) {
  const { lang, t } = useTranslation();
  const [viewMode, setViewMode] = useState('incomeVsExpenses');
  const [range, setRange] = useState(12);
  const [showMA, setShowMA] = useState(false);

  const data = timeSeriesData || [];
  const hasData = data.length > 0 && data.some(d => d.income > 0 || d.expenses > 0);

  if (!hasData) {
    return (
      <div className="bc-card">
        <div className="bc-chart-wrap">
          <div className="bc-empty-state">{t.noTrendsData}</div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Split data into past and future for styling
  const chartData = data.map(d => ({
    ...d,
    label: getMonthLabel(d.key, lang),
    // For dual-tone areas: past vs future
    incomePast: !d.isFuture ? d.income : null,
    incomeFuture: d.isFuture ? d.income : null,
    expensesPast: !d.isFuture ? d.expenses : null,
    expensesFuture: d.isFuture ? d.expenses : null,
    netPast: !d.isFuture ? d.net : null,
    netFuture: d.isFuture ? d.net : null,
    cumulativePast: !d.isFuture ? d.cumulative : null,
    cumulativeFuture: d.isFuture ? d.cumulative : null,
  }));

  // Bridge: last past point also appears as first future point for continuity
  const futureStartIdx = chartData.findIndex(d => d.isFuture);
  if (futureStartIdx > 0) {
    const bridge = chartData[futureStartIdx - 1];
    chartData[futureStartIdx].incomeFuture = chartData[futureStartIdx].income;
    chartData[futureStartIdx].expensesFuture = chartData[futureStartIdx].expenses;
    chartData[futureStartIdx].netFuture = chartData[futureStartIdx].net;
    chartData[futureStartIdx].cumulativeFuture = chartData[futureStartIdx].cumulative;
    // Also set the bridge point to have future values for line continuity
    chartData[futureStartIdx - 1] = {
      ...bridge,
      incomeFuture: bridge.income,
      expensesFuture: bridge.expenses,
      netFuture: bridge.net,
      cumulativeFuture: bridge.cumulative,
    };
  }

  const tooltipStyle = {
    contentStyle: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: '#ccc' },
    itemStyle: { color: '#e8e8e8' },
  };

  const renderTooltipFormatter = (value, name) => {
    if (value == null) return [null, null];
    return [formatNOK(value), name];
  };

  const modeButtons = VIEW_MODES.map(m => (
    <button
      key={m}
      className={`bc-freq-btn ${viewMode === m ? 'active' : ''}`}
      onClick={() => setViewMode(m)}
    >
      {t[m]}
    </button>
  ));

  const rangeButtons = RANGES.map(r => (
    <button
      key={r.key}
      className={`bc-freq-btn ${range === r.key ? 'active' : ''}`}
      onClick={() => setRange(r.key)}
    >
      {t[r.label]}
    </button>
  ));

  return (
    <div className="bc-card">
      <div className="bc-trends-toolbar">
        <div className="bc-freq-toggle">{modeButtons}</div>
        <div className="bc-freq-toggle">{rangeButtons}</div>
        <label className="bc-extra-check" style={{ color: showMA ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
          <input type="checkbox" checked={showMA} onChange={e => setShowMA(e.target.checked)} />
          {t.showMovingAvg}
        </label>
      </div>

      <div className="bc-chart-wrap">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
            <XAxis
              dataKey="label"
              tick={{ fill: '#999', fontSize: 11 }}
              axisLine={{ stroke: '#1f1f1f' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#999', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => formatNOK(v).replace(' kr', '')}
              width={60}
            />
            <ReTooltip
              {...tooltipStyle}
              formatter={renderTooltipFormatter}
            />
            <ReferenceLine
              x={getMonthLabel(currentKey, lang)}
              stroke="#e8e8e8"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: t.now, position: 'top', fill: '#e8e8e8', fontSize: 11 }}
            />

            {viewMode === 'incomeVsExpenses' && (
              <>
                {/* Past income */}
                <Area type="monotone" dataKey="incomePast" name={t.income}
                  fill="#52B788" fillOpacity={0.15} stroke="#52B788" strokeWidth={2}
                  connectNulls={false} dot={false} />
                {/* Future income */}
                <Area type="monotone" dataKey="incomeFuture" name={`${t.income} (${t.projected})`}
                  fill="#52B788" fillOpacity={0.06} stroke="#52B788" strokeWidth={2}
                  strokeDasharray="6 3" connectNulls={false} dot={false} />
                {/* Past expenses */}
                <Area type="monotone" dataKey="expensesPast" name={t.expenses}
                  fill="#E07A5F" fillOpacity={0.15} stroke="#E07A5F" strokeWidth={2}
                  connectNulls={false} dot={false} />
                {/* Future expenses */}
                <Area type="monotone" dataKey="expensesFuture" name={`${t.expenses} (${t.projected})`}
                  fill="#E07A5F" fillOpacity={0.06} stroke="#E07A5F" strokeWidth={2}
                  strokeDasharray="6 3" connectNulls={false} dot={false} />
                {/* Net line */}
                <Line type="monotone" dataKey="net" name={t.net}
                  stroke="#e8e8e8" strokeWidth={1.5} dot={false} />
              </>
            )}

            {viewMode === 'byExpenseCategory' && (
              <>
                {expenseCategories.map(ec => (
                  <Area key={ec.id} type="monotone" dataKey={`cat_${ec.id}`} name={ec.name}
                    stackId="expenses" fill={ec.color} fillOpacity={0.6}
                    stroke={ec.color} strokeWidth={1} dot={false} />
                ))}
                <Line type="monotone" dataKey="income" name={t.income}
                  stroke="#52B788" strokeWidth={2} dot={false} />
              </>
            )}

            {viewMode === 'cumulative' && (
              <>
                <Area type="monotone" dataKey="cumulativePast" name={t.cumulative}
                  fill="#52B788" fillOpacity={0.2} stroke="#52B788" strokeWidth={2}
                  connectNulls={false} dot={false} />
                <Area type="monotone" dataKey="cumulativeFuture" name={`${t.cumulative} (${t.projected})`}
                  fill="#52B788" fillOpacity={0.08} stroke="#52B788" strokeWidth={2}
                  strokeDasharray="6 3" connectNulls={false} dot={false} />
              </>
            )}

            {showMA && (
              <Line type="monotone" dataKey="movingAvgNet" name={t.showMovingAvg}
                stroke="#F2CC8F" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            )}

            <Legend wrapperStyle={{ fontSize: 11, color: '#999' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
