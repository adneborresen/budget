import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../i18n.jsx';
import { annualize, fromYearly, formatNOK, FREQS } from '../helpers.js';

export default function FixedItemRow({ item, catId, viewFreq, updateItem, deleteItem }) {
  const nameRef = useRef(null);
  const amountRef = useRef(null);
  useEffect(() => {
    if (item.isNew && nameRef.current) {
      nameRef.current.focus();
      nameRef.current.select();
      updateItem(catId, item.id, 'isNew', false);
    }
  }, []);
  const { t } = useTranslation();
  const FREQ_LABELS = { daily: t.daily, weekly: t.weekly, monthly: t.monthly, yearly: t.yearly };
  const yearly = annualize(item.amount || 0, item.frequency);
  const converted = fromYearly(yearly, viewFreq);
  const showConverted = item.frequency !== viewFreq;

  return (
    <div className="bc-item-row">
      <div className="bc-item-name-cell">
        <input
          ref={nameRef}
          className="bc-input"
          value={item.name}
          onChange={e => updateItem(catId, item.id, 'name', e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') amountRef.current?.focus(); }}
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
      <div className="bc-item-row-fields">
        <input
          ref={amountRef}
          className="bc-input-num"
          type="number"
          min="0"
          value={item.amount || ''}
          onChange={e => updateItem(catId, item.id, 'amount', parseFloat(e.target.value) || 0)}
          aria-label="Amount"
        />
        <select
          className="bc-select"
          value={item.frequency}
          onChange={e => updateItem(catId, item.id, 'frequency', e.target.value)}
          aria-label="Frequency"
        >
          {FREQS.map(f => <option key={f} value={f}>{FREQ_LABELS[f]}</option>)}
        </select>
        <div className="bc-converted bc-mono">
          {showConverted ? formatNOK(converted) + '/' + viewFreq.charAt(0) : ''}
        </div>
      </div>
      <button className="bc-del-btn" onClick={() => deleteItem(catId, item.id)} aria-label={`Delete ${item.name}`}>
        <X size={14} />
      </button>
    </div>
  );
}
