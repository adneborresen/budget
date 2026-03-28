import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Plus } from 'lucide-react';
import { useTranslation } from '../i18n.jsx';
import { formatNOK, getCatColor } from '../helpers.js';
import FixedItemRow from './FixedItemRow.jsx';
import TrackingItemRow from './TrackingItemRow.jsx';

export default function CategorySection({ cat, viewFreq, catTotal, toggleCollapse, deleteCategory, addItem, deleteItem, updateItem, logPurchase, deletePurchase, lockItem }) {
  const [showAddChoice, setShowAddChoice] = useState(false);
  const { t } = useTranslation();
  const color = getCatColor(cat.name);

  return (
    <div className="bc-cat-section">
      <div className="bc-cat-header" onClick={() => toggleCollapse(cat.id)} role="button" aria-expanded={!cat.collapsed} aria-label={`${cat.name} — ${formatNOK(catTotal)}`}>
        {cat.collapsed
          ? <ChevronRight size={16} className="chevron closed" />
          : <ChevronDown size={16} className="chevron open" />
        }
        <div className="bc-cat-bar" style={{ background: color }} />
        <span className="bc-cat-header-name">{cat.name}</span>
        <span className="bc-cat-header-count">{cat.items.length}</span>
        <span className="bc-cat-header-total bc-mono">{formatNOK(catTotal)}</span>
        <button className="bc-cat-header-del" onClick={e => { e.stopPropagation(); deleteCategory(cat.id); }} aria-label={`Delete ${cat.name}`}>
          <Trash2 size={14} />
        </button>
      </div>

      {!cat.collapsed && (
        <div className="bc-cat-body">
          {cat.items.map(item =>
            item.mode === 'fixed' ? (
              <FixedItemRow
                key={item.id}
                item={item}
                catId={cat.id}
                viewFreq={viewFreq}
                updateItem={updateItem}
                deleteItem={deleteItem}
              />
            ) : (
              <TrackingItemRow
                key={item.id}
                item={item}
                catId={cat.id}
                viewFreq={viewFreq}
                updateItem={updateItem}
                deleteItem={deleteItem}
                logPurchase={logPurchase}
                deletePurchase={deletePurchase}
                lockItem={lockItem}
              />
            )
          )}

          {showAddChoice ? (
            <div className="bc-add-choice">
              <button className="bc-small-btn" onClick={() => { addItem(cat.id, 'fixed'); setShowAddChoice(false); }}>{t.fixedAmount}</button>
              <button className="bc-small-btn" onClick={() => { addItem(cat.id, 'tracking'); setShowAddChoice(false); }}>{t.trackToLearn}</button>
              <button className="bc-small-btn" onClick={() => setShowAddChoice(false)}>{t.cancel}</button>
            </div>
          ) : (
            <button className="bc-add-btn" onClick={() => setShowAddChoice(true)}>
              <Plus size={14} /> {t.addItem}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
