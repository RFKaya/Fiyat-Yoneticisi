import React from 'react';
import { getPlatformColor, type PlatformId } from '@/lib/platforms';

interface PlatformSectionProps {
  platform: string;
  rev: number;
  commRate: number;
  adVal: number;
  onUpdateCommission: (platform: any, value: string) => void;
  onUpdatePlatformAd: (platform: any, value: string) => void;
}

export function PlatformSection({
  platform,
  rev,
  commRate,
  adVal,
  onUpdateCommission,
  onUpdatePlatformAd
}: PlatformSectionProps) {
  const pCommVal = rev * (commRate / 100);
  const adWeightedComm = rev > 0 ? ((pCommVal + adVal) / rev) * 100 : 0;
  const borderColor = getPlatformColor(platform as PlatformId);

  return (
    <div className="ledger-glass-panel" style={{ borderLeft: `4px solid ${borderColor}` }}>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'capitalize' }}>{platform}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--ledger-text-secondary)' }}>Komisyon (%)</label>
          <input
            type="number"
            className="ledger-premium-input"
            value={commRate || ''}
            onChange={(e) => onUpdateCommission(platform, e.target.value)}
            placeholder="%"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--ledger-text-secondary)' }}>Reklam (₺)</label>
          <input
            type="number"
            className="ledger-premium-input"
            value={adVal || ''}
            onChange={(e) => onUpdatePlatformAd(platform, e.target.value)}
            placeholder="₺"
          />
        </div>
      </div>
      <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--ledger-panel-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.8 }}>
        <span>Reklamlı Komisyon Oranı:</span>
        <span style={{ fontWeight: 'bold' }}>%{adWeightedComm.toFixed(1)}</span>
      </div>
    </div>
  );
}
