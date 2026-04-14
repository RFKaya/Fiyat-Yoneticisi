import React from 'react';

type MonthlyCost = { id: string; name: string; amount: number | string };

interface LedgerSummaryProps {
  totals: {
    shopProfit: number;
    onlineProfit: number;
    netProfit: number;
    shop: number;
    online: number;
    costs: number;
    rent: number;
    ads: number;
    electricity: number;
    water: number;
    accounting: number;
    margins: { shop: number; online: number };
  };
  costs: MonthlyCost[];
  onUpdateFixedCost: (field: any, value: string) => void;
  onUpdateCost: (id: string, field: string, value: string) => void;
  onDeleteCost: (id: string) => void;
  onAddCost: () => void;
  onUpdateMargin: (type: 'shop' | 'online', value: string) => void;
  isEditingShopMargin: boolean;
  setIsEditingShopMargin: (v: boolean) => void;
  isEditingOnlineMargin: boolean;
  setIsEditingOnlineMargin: (v: boolean) => void;
  fmt: (v: any, decimals?: number) => string;
}

export function LedgerSummary({
  totals,
  costs,
  onUpdateFixedCost,
  onUpdateCost,
  onDeleteCost,
  onAddCost,
  onUpdateMargin,
  isEditingShopMargin,
  setIsEditingShopMargin,
  isEditingOnlineMargin,
  setIsEditingOnlineMargin,
  fmt
}: LedgerSummaryProps) {
  return (
    <div className="ledger-glass-panel ledger-summary-panel">
      <h2 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Aylık Özet Raporu</h2>
      <div className="ledger-summary-grid">
        <div className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-success)', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ledger-card-label" style={{ display: 'flex', alignItems: 'center' }}>
              Dükkan Kârı
              {isEditingShopMargin ? (
                <input
                  autoFocus
                  className="ledger-premium-input"
                  style={{ width: '60px', padding: '0.2rem 0.4rem', marginLeft: '0.5rem', fontSize: '0.8rem', height: 'auto' }}
                  value={totals.margins.shop || ''}
                  onChange={(e) => onUpdateMargin('shop', e.target.value)}
                  onBlur={() => setIsEditingShopMargin(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingShopMargin(false)}
                />
              ) : (
                <span onClick={() => setIsEditingShopMargin(true)} style={{ cursor: 'pointer', marginLeft: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
                  (%{totals.margins.shop}) ✎
                </span>
              )}
            </span>
            <span className="ledger-card-value ledger-text-success">{fmt(totals.shopProfit)} ₺</span>
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            <span className="ledger-text-success">Ciro: {fmt(totals.shop)} ₺</span>
            <span className="ledger-text-danger">Maliyetler: {fmt(totals.shop - totals.shopProfit)} ₺</span>
          </div>
        </div>

        <div className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-success)', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', height: 'auto' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ledger-card-label" style={{ display: 'flex', alignItems: 'center' }}>
              Online Kâr
              {isEditingOnlineMargin ? (
                <input
                  autoFocus
                  className="ledger-premium-input"
                  style={{ width: '60px', padding: '0.2rem 0.4rem', marginLeft: '0.5rem', fontSize: '0.8rem', height: 'auto' }}
                  value={totals.margins.online || ''}
                  onChange={(e) => onUpdateMargin('online', e.target.value)}
                  onBlur={() => setIsEditingOnlineMargin(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingOnlineMargin(false)}
                />
              ) : (
                <span onClick={() => setIsEditingOnlineMargin(true)} style={{ cursor: 'pointer', marginLeft: '0.5rem', fontSize: '0.8rem', opacity: 0.7 }}>
                  (%{totals.margins.online}) ✎
                </span>
              )}
            </span>
            <span className="ledger-card-value ledger-text-success">{fmt(totals.onlineProfit)} ₺</span>
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            <span className="ledger-text-success">Ciro: {fmt(totals.online)} ₺</span>
            <span className="ledger-text-danger">Maliyetler: {fmt(totals.online - totals.onlineProfit)} ₺</span>
          </div>
        </div>

        <div className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-danger)', opacity: 0.9 }}>
          <span className="ledger-card-label">Kira Maliyeti</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="number"
              className="ledger-premium-input"
              style={{ width: '80px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', height: '34px', textAlign: 'right' }}
              value={totals.rent || ''}
              onChange={(e) => onUpdateFixedCost('rent', e.target.value)}
              placeholder="₺"
            />
            <span className="ledger-card-value" style={{ fontSize: '0.9rem' }}>₺</span>
          </div>
        </div>

        <div className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-danger)', opacity: 0.9 }}>
          <span className="ledger-card-label">Reklam Maliyeti (Oto)</span>
          <span className="ledger-card-value">{fmt(totals.ads)} ₺</span>
        </div>

        <div className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-danger)', opacity: 0.9 }}>
          <span className="ledger-card-label">Elektrik</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="number"
              className="ledger-premium-input"
              style={{ width: '80px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', height: '34px', textAlign: 'right' }}
              value={totals.electricity || ''}
              onChange={(e) => onUpdateFixedCost('electricity', e.target.value)}
              placeholder="₺"
            />
            <span className="ledger-card-value" style={{ fontSize: '0.9rem' }}>₺</span>
          </div>
        </div>

        <div className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-danger)', opacity: 0.9 }}>
          <span className="ledger-card-label">Su</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="number"
              className="ledger-premium-input"
              style={{ width: '80px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', height: '34px', textAlign: 'right' }}
              value={totals.water || ''}
              onChange={(e) => onUpdateFixedCost('water', e.target.value)}
              placeholder="₺"
            />
            <span className="ledger-card-value" style={{ fontSize: '0.9rem' }}>₺</span>
          </div>
        </div>

        <div className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-danger)', opacity: 0.9 }}>
          <span className="ledger-card-label">Muhasebe</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <input
              type="number"
              className="ledger-premium-input"
              style={{ width: '80px', padding: '0.4rem 0.6rem', fontSize: '0.9rem', height: '34px', textAlign: 'right' }}
              value={totals.accounting || ''}
              onChange={(e) => onUpdateFixedCost('accounting', e.target.value)}
              placeholder="₺"
            />
            <span className="ledger-card-value" style={{ fontSize: '0.9rem' }}>₺</span>
          </div>
        </div>

        {costs.map(cost => (
          <div key={cost.id} className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-danger)', padding: '0.75rem 1rem' }}>
            <input
              className="ledger-premium-input"
              style={{ background: 'transparent', border: 'none', width: '120px', padding: '0', fontSize: '0.85rem' }}
              placeholder="Gider Adı..."
              value={cost.name}
              onChange={(e) => onUpdateCost(cost.id, 'name', e.target.value)}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="number"
                className="ledger-premium-input"
                style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.85rem', height: '30px', textAlign: 'right' }}
                value={cost.amount || ''}
                onChange={(e) => onUpdateCost(cost.id, 'amount', e.target.value)}
                placeholder="₺"
              />
              <button className="icon-btn" onClick={() => onDeleteCost(cost.id)} style={{ color: 'var(--ledger-danger)', padding: '0 0.2rem', fontSize: '1rem' }}>✕</button>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <button
            className="primary-btn"
            onClick={onAddCost}
            style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', background: 'transparent', border: '1px dashed var(--ledger-danger)', color: 'var(--ledger-danger)' }}
          >
            + Gider Ekle
          </button>
        </div>

        <div className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-success)', background: 'rgba(34, 197, 94, 0.05)', flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem', marginTop: '0.5rem', height: 'auto' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="ledger-card-label" style={{ fontWeight: 'bold' }}>Net Kâr (Sonuç)</span>
            <span className="ledger-card-value ledger-text-success" style={{ fontSize: '1.4rem' }}>{fmt(totals.netProfit)} ₺</span>
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
            <span className="ledger-text-success">Toplam Brüt Kâr: {fmt(totals.shopProfit + totals.onlineProfit)} ₺</span>
            <span className="ledger-text-danger">Toplam Giderler: {fmt(totals.costs + totals.rent + totals.ads + totals.electricity + totals.water + totals.accounting)} ₺</span>
          </div>
        </div>
      </div>
    </div>
  );
}
