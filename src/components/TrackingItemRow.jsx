import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Lock } from 'lucide-react';
import { useTranslation } from '../i18n.jsx';
import { fromYearly, formatNOK, computeTracking } from '../helpers.js';

export default function TrackingItemRow({ item, catId, viewFreq, updateItem, deleteItem, logPurchase, deletePurchase, lockItem }) {
  const [showForm, setShowForm] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => {
    if (item.isNew && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
      updateItem(catId, item.id, 'isNew', false);
    }
  }, []);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState('');
  const { t } = useTranslation();
  const FREQ_LABELS = { daily: t.daily, weekly: t.weekly, monthly: t.monthly, yearly: t.yearly };

  const { inferredIntervalDays, averageAmount } = computeTracking(item.purchases);
  const hasEstimate = inferredIntervalDays != null && inferredIntervalDays > 0;
  const yearly = hasEstimate ? (averageAmount / inferredIntervalDays) * 365 : 0;
  const viewAmount = fromYearly(yearly, viewFreq);

  const handleSubmit = () => {
    if (!formAmount || !formDate) return;
    const dateObj = new Date(formDate);
    if (isNaN(dateObj.getTime())) return;
    const parsed = parseFloat(formAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    logPurchase(catId, item.id, formDate, formAmount);
    setFormAmount('');
    setShowForm(false);
  };

  return (
    <div className="bc-track-row">
      <div className="bc-track-header">
        <div className="bc-item-name-cell">
          <input
            ref={nameRef}
            className="bc-input bc-track-name"
            value={item.name}
            onChange={e => updateItem(catId, item.id, 'name', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); setShowForm(true); } }}
            aria-label="Item name"
          />
          <button
            className={`bc-extra-btn ${item.isExtraordinary ? 'active' : ''}`}
            onClick={() => updateItem(catId, item.id, 'isExtraordinary', !item.isExtraordinary)}
            title={t.toggleExtraordinaryTitle}
            aria-label={t.toggleExtraordinaryTitle}
            aria-pressed={!!item.isExtraordinary}
          >{t.extra}</button>
        </div>
        <span className="bc-tracking-badge">{t.tracking}</span>
        <div className="bc-track-spacer" />
        <button className="bc-del-btn" onClick={() => deleteItem(catId, item.id)} aria-label={`Delete ${item.name}`}>
          <X size={14} />
        </button>
      </div>

      {/* Purchase pills */}
      {item.purchases && item.purchases.length > 0 && (
        <div className="bc-track-pills">
          {[...item.purchases]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(p => (
              <div key={p.id} className="bc-pill">
                <span className="bc-mono">{formatNOK(p.amount)}</span>
                <span>·</span>
                <span>{new Date(p.date).toLocaleDateString('nb-NO', { month: 'short', day: 'numeric' })}</span>
                <button onClick={() => deletePurchase(catId, item.id, p.id)} aria-label={`Delete purchase ${formatNOK(p.amount)}`}><X size={14} /></button>
              </div>
            ))}
        </div>
      )}

      {/* Log purchase */}
      {showForm ? (
        <div className="bc-track-form">
          <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} aria-label="Purchase date" />
          <input
            type="number" placeholder={t.amount} value={formAmount}
            onChange={e => setFormAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
            className="bc-track-amount"
            aria-label="Purchase amount"
          />
          <button className="bc-small-btn green" onClick={handleSubmit}>{t.add}</button>
          <button className="bc-small-btn" onClick={() => setShowForm(false)}>{t.cancel}</button>
        </div>
      ) : (
        <button className="bc-add-btn" onClick={() => setShowForm(true)}>
          <Plus size={12} /> {t.logPurchase}
        </button>
      )}

      {/* Estimate */}
      <div className="bc-track-est">
        {!item.purchases || item.purchases.length < 2 ? (
          t.waitingForPurchase
        ) : hasEstimate ? (
          <>
            <span className="bc-mono">~{formatNOK(viewAmount)}</span>
            {' / '}{FREQ_LABELS[viewFreq].toLowerCase()}
            {' '}({t.basedOn(item.purchases.length, Math.round(inferredIntervalDays))})
            <button className="bc-small-btn bc-lock-btn" onClick={() => lockItem(catId, item.id)} aria-label={t.lockEstimate}>
              <Lock size={10} /> {t.lockEstimate}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
