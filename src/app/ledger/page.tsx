'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from '@/components/layout/Header';
import './ledger.css';

type PlatformData = { count: number | string; rev: number | string };
type DayData = {
  id: string;
  date: string;
  cash: number | string;
  pos: number | string;
  mealCard: number | string;
  kg: number | string;
  platforms: {
    migros: PlatformData;
    getir: PlatformData;
    yemeksepeti: PlatformData;
    trendyol: PlatformData;
  };
};

type MonthlyCost = { id: string; name: string; amount: number | string };
type MonthData = {
  days: DayData[];
  costs: MonthlyCost[];
  commissions?: {
    migros: number;
    getir: number;
    yemeksepeti: number;
    trendyol: number;
  };
  margins?: {
    shop: number;
    online: number;
  };
  rent?: number;
  ads?: number;
  electricity?: number;
  water?: number;
  accounting?: number;
  platformAds?: {
    migros: number;
    getir: number;
    yemeksepeti: number;
    trendyol: number;
  };
};
type ShopData = {
  months: Record<string, MonthData>;
  shopName?: string;
};
type ShopInfo = { id: string; name: string };

const months = [
  { id: '01', name: 'Oca' }, { id: '02', name: 'Şub' }, { id: '03', name: 'Mar' },
  { id: '04', name: 'Nis' }, { id: '05', name: 'May' }, { id: '06', name: 'Haz' },
  { id: '07', name: 'Tem' }, { id: '08', name: 'Ağu' }, { id: '09', name: 'Eyl' },
  { id: '10', name: 'Eki' }, { id: '11', name: 'Kas' }, { id: '12', name: 'Ara' }
];

// Safely generate a unique ID
const generateId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
};

// Robust number parsing with Turkish comma support
const parseNumber = (v: any): number => {
  if (v === undefined || v === null || v === '' || v === '-') return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(',', '.')) || 0;
};

export default function LedgerPage() {
  const [shops, setShops] = useState<ShopInfo[]>([]);
  const [currentShopId, setCurrentShopId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSelectedShopId') || '1';
    }
    return '1';
  });
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear().toString());
  const [currentMonth, setCurrentMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'));
  const [shopData, setShopData] = useState<ShopData>({ months: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [shopTitleInput, setShopTitleInput] = useState('');
  const [isEditingShopMargin, setIsEditingShopMargin] = useState(false);
  const [isEditingOnlineMargin, setIsEditingOnlineMargin] = useState(false);

  const currentMonthKey = `${currentYear}-${currentMonth}`;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persist currentShopId to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedShopId', currentShopId);
    }
  }, [currentShopId]);

  useEffect(() => {
    fetch('/api/shops')
      .then((res) => {
        if (!res.ok) throw new Error('Dükkanlar yüklenemedi');
        return res.json();
      })
      .then(data => {
      setShops(data);
    }).catch(error => {
      window.dispatchEvent(new CustomEvent('app-fetch-error', { detail: 'Dükkan listesi alınamadı. Lütfen sayfayı yenileyin.' }));
    });
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/ledger?shop=${currentShopId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Veriler yüklenemedi');
        return res.json();
      })
      .then(data => {
        setShopData(data);
        setIsLoading(false);
      });
  }, [currentShopId]);

  const monthData = useMemo(() => {
    if (!shopData.months || !shopData.months[currentMonthKey]) {
      const yearNum = parseInt(currentYear);
      const monthNum = parseInt(currentMonth);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const initialDays: DayData[] = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${currentYear}-${currentMonth}-${i.toString().padStart(2, '0')}`;
        initialDays.push({
          id: dateStr, date: dateStr, cash: 0, pos: 0, mealCard: 0, kg: 0,
          platforms: {
            migros: { count: 0, rev: 0 }, getir: { count: 0, rev: 0 },
            yemeksepeti: { count: 0, rev: 0 }, trendyol: { count: 0, rev: 0 }
          }
        });
      }
      return { days: initialDays, costs: [] };
    }
    return shopData.months[currentMonthKey];
  }, [shopData, currentMonthKey, currentYear, currentMonth]);

  useEffect(() => {
    if (isLoading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch(`/api/ledger?shop=${currentShopId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopData)
      })
      .then((res) => {
         if (!res.ok) throw new Error('Kayıt başarısız');
      })
      .catch(error => {
         window.dispatchEvent(new CustomEvent('app-fetch-error', { detail: 'Değişiklikler kaydedilemedi! Lütfen sistemin kilitli olup olmadığını kontrol edin.' }));
      });
    }, 1000);
  }, [shopData, currentShopId, isLoading]);

  const updateDay = (id: string, field: string, value: string, platform?: keyof DayData['platforms'], pField?: keyof PlatformData) => {
    // Only allow numbers, comma, and dot
    const filteredValue = value.replace(/[^0-9,.]/g, '');
    
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      const days = [...currentMonthData.days];
      const dayIndex = days.findIndex(d => d.id === id);
      if (dayIndex === -1) return prev;

      const day = { ...days[dayIndex] };

      if (platform && pField) {
        day.platforms = { ...day.platforms, [platform]: { ...day.platforms[platform], [pField]: filteredValue } };
      } else {
        (day as any)[field] = filteredValue;
      }

      days[dayIndex] = day;
      return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, days } } };
    });
  };

  const addCost = () => {
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      const costs = [...currentMonthData.costs, { id: generateId(), name: '', amount: 0 }];
      return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, costs } } };
    });
  };

  const updateCost = (id: string, field: string, value: string) => {
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      const costs = currentMonthData.costs.map(c =>
        c.id === id ? { ...c, [field]: field === 'amount' ? value.replace(/[^0-9,.]/g, '') : value } : c
      );
      return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, costs } } };
    });
  };

  const deleteCost = (id: string) => {
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      const costs = currentMonthData.costs.filter(c => c.id !== id);
      return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, costs } } };
    });
  };

  const updateCommission = (platform: keyof NonNullable<MonthData['commissions']>, value: string) => {
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      const commissions = {
        ...(currentMonthData.commissions || { migros: 0, getir: 0, yemeksepeti: 0, trendyol: 0 }),
        [platform]: parseFloat(value) || 0
      };
      return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, commissions } } };
    });
  };

  const updateMargin = (type: 'shop' | 'online', value: string) => {
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      const margins = {
        ...(currentMonthData.margins || { shop: 0, online: 0 }),
        [type]: parseFloat(value) || 0
      };
      return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, margins } } };
    });
  };

  const updateFixedCost = (field: 'rent' | 'ads' | 'electricity' | 'water' | 'accounting', value: string) => {
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      return {
        ...prev,
        months: {
          ...currentMonths,
          [currentMonthKey]: { ...currentMonthData, [field]: parseFloat(value) || 0 }
        }
      };
    });
  };

  const updatePlatformAd = (platform: keyof NonNullable<MonthData['platformAds']>, value: string) => {
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      const platformAds = {
        ...(currentMonthData.platformAds || { migros: 0, getir: 0, yemeksepeti: 0, trendyol: 0 }),
        [platform]: parseFloat(value) || 0
      };
      return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, platformAds } } };
    });
  };

  const saveShopTitle = () => {
    setShopData(prev => {
      const newData = { ...prev, shopName: shopTitleInput };
      return newData;
    });
    setShops(prev => prev.map(s => s.id === currentShopId ? { ...s, name: shopTitleInput } : s));
    setIsEditingTitle(false);
  };

  const totals = useMemo(() => {
    const res = { shop: 0, online: 0, onlineCount: 0, kg: 0, grand: 0, costs: 0, commissions: 0 };
    const comms = monthData.commissions || { migros: 0, getir: 0, yemeksepeti: 0, trendyol: 0 };

    monthData.days.forEach(d => {
      const shopRow = parseNumber(d.cash) + parseNumber(d.pos) + parseNumber(d.mealCard);
      const onlineRow = parseNumber(d.platforms.migros.rev) + parseNumber(d.platforms.getir.rev) + parseNumber(d.platforms.yemeksepeti.rev) + parseNumber(d.platforms.trendyol.rev);
      const onlineCountRow = parseNumber(d.platforms.migros.count) + parseNumber(d.platforms.getir.count) + parseNumber(d.platforms.yemeksepeti.count) + parseNumber(d.platforms.trendyol.count);

      const dayComm = (parseNumber(d.platforms.migros.rev) * (comms.migros || 0) / 100) +
        (parseNumber(d.platforms.getir.rev) * (comms.getir || 0) / 100) +
        (parseNumber(d.platforms.yemeksepeti.rev) * (comms.yemeksepeti || 0) / 100) +
        (parseNumber(d.platforms.trendyol.rev) * (comms.trendyol || 0) / 100);

      res.shop += shopRow;
      res.online += onlineRow;
      res.onlineCount += onlineCountRow;
      res.kg += parseNumber(d.kg);
      res.grand += (shopRow + onlineRow);
      res.commissions += dayComm;
    });
    res.costs = monthData.costs.reduce((acc, c) => acc + parseNumber(c.amount), 0);

    const margins = monthData.margins || { shop: 0, online: 0 };
    const shopProfit = res.shop * (margins.shop / 100);
    const onlineProfit = res.online * (margins.online / 100);
    const rent = monthData.rent || 0;
    const platformAdsSum = monthData.platformAds ? Object.values(monthData.platformAds).reduce((a, b) => a + (b || 0), 0) : 0;
    const ads = platformAdsSum || monthData.ads || 0;
    const electricity = monthData.electricity || 0;
    const water = monthData.water || 0;
    const accounting = monthData.accounting || 0;
    const netProfit = (shopProfit + onlineProfit) - res.costs - rent - ads - electricity - water - accounting;

    return { ...res, shopProfit, onlineProfit, netProfit, margins, rent, ads, electricity, water, accounting };
  }, [monthData]);

  const fmt = (v: any, decimals = 0) => {
    const val = typeof v === 'number' ? v : parseNumber(v);
    return new Intl.NumberFormat('tr-TR', { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    }).format(val);
  };

  return (
    <div className="ledger-container">
      {isLoading && (
        <div className="ledger-loading-overlay">
          <div className="ledger-spinner"></div>
          <p style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '0.05em' }}>Veriler Yükleniyor...</p>
        </div>
      )}
      <Header />
      <div className="ledger-wrapper">
        <div className="ledger-content-container">
          <header className="ledger-glass-panel ledger-header">
            <div>
              <h1>Aylık Hesap Dökümü</h1>
              <p className="ledger-subtitle">İşletmenizin nakit, pos ve online platform verilerini takip edin.</p>
            </div>
            <div className="ledger-selectors">
              <div className="ledger-shop-selector">
                <label>İşyeri:</label>
                <select className="ledger-premium-input" value={currentShopId} onChange={(e) => setCurrentShopId(e.target.value)}>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="ledger-month-year-selector">
                <select className="ledger-premium-input" value={currentYear} onChange={(e) => setCurrentYear(e.target.value)}>
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <div className="ledger-month-buttons">
                  {months.map(m => (
                    <button key={m.id} className={currentMonth === m.id ? 'active' : ''} onClick={() => setCurrentMonth(m.id)}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <div className="ledger-main-layout">
            <div className="ledger-glass-panel ledger-table-panel">
              <div className="ledger-panel-header">
                {isEditingTitle ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="ledger-premium-input" value={shopTitleInput} onChange={(e) => setShopTitleInput(e.target.value)} />
                    <button className="primary-btn" onClick={saveShopTitle} style={{ padding: '0.4rem 1rem' }}>Kaydet</button>
                  </div>
                ) : (
                  <h2 onClick={() => { setIsEditingTitle(true); setShopTitleInput(shopData.shopName || shops.find(s => s.id === currentShopId)?.name || ''); }}>
                    {shopData.shopName || shops.find(s => s.id === currentShopId)?.name || 'İşyeri'} <span style={{ cursor: 'pointer', fontSize: '1rem' }}>✎</span>
                  </h2>
                )}
              </div>
              <div className="ledger-table-responsive">
                <table className="ledger-modern-table">
                  <colgroup><col style={{ width: '90px' }} /><col style={{ width: '85px' }} /><col style={{ width: '85px' }} /><col style={{ width: '85px' }} /><col style={{ width: '55px' }} /><col style={{ width: '40px' }} /><col style={{ width: '85px' }} /><col style={{ width: '40px' }} /><col style={{ width: '85px' }} /><col style={{ width: '40px' }} /><col style={{ width: '85px' }} /><col style={{ width: '40px' }} /><col style={{ width: '85px' }} /><col style={{ width: '75px' }} /><col style={{ width: '60px' }} /><col style={{ width: '75px' }} /><col style={{ width: '65px' }} /><col style={{ width: '85px' }} /></colgroup>
                  <thead>
                    <tr>
                      <th rowSpan={2}>Tarih</th><th rowSpan={2}>Nakit</th><th rowSpan={2}>POS</th><th rowSpan={2}>Yemek Kartı</th><th rowSpan={2}>Kg</th>
                      <th colSpan={2} className="platform-migros">Migros</th><th colSpan={2} className="platform-getir">Getir</th><th colSpan={2} className="platform-yemeksepeti">Y.Sepeti</th><th colSpan={2} className="platform-trendyol">Trendyol</th>
                      <th rowSpan={2} className="ledger-highlight-col">Dükkan</th><th rowSpan={2} className="ledger-highlight-col">Online Ad.</th>
                      <th rowSpan={2} className="ledger-highlight-col">Online ₺</th><th rowSpan={2} className="ledger-highlight-col">Ort.₺/Kg</th>
                      <th rowSpan={2} className="ledger-highlight-col">Toplam</th>
                    </tr>
                    <tr>
                      <th>Ad.</th><th>₺</th><th>Ad.</th><th>₺</th><th>Ad.</th><th>₺</th><th>Ad.</th><th>₺</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthData.days.map(day => {
                      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
                      const isToday = day.date === todayStr;
                      const isPast = day.date < todayStr;

                      const shopRow = parseNumber(day.cash) + parseNumber(day.pos) + parseNumber(day.mealCard);
                      const onlineRow = parseNumber(day.platforms.migros.rev) + parseNumber(day.platforms.getir.rev) + parseNumber(day.platforms.yemeksepeti.rev) + parseNumber(day.platforms.trendyol.rev);
                      const onlineCountRow = parseNumber(day.platforms.migros.count) + parseNumber(day.platforms.getir.count) + parseNumber(day.platforms.yemeksepeti.count) + parseNumber(day.platforms.trendyol.count);
                      const totalRow = shopRow + onlineRow;
                      const avgKgPrice = parseNumber(day.kg) > 0 ? totalRow / parseNumber(day.kg) : 0;
                      return (
                        <tr key={day.id} className={`${isToday ? 'ledger-row-today' : ''} ${isPast ? 'ledger-row-past' : ''}`}>
                          <td style={{ textAlign: 'center' }}>{day.date.split('-').reverse().join('.')}</td>
                          <td><input value={day.cash || ''} onChange={(e) => updateDay(day.id, 'cash', e.target.value)} /></td>
                          <td><input value={day.pos || ''} onChange={(e) => updateDay(day.id, 'pos', e.target.value)} /></td>
                          <td><input value={day.mealCard || ''} onChange={(e) => updateDay(day.id, 'mealCard', e.target.value)} /></td>
                          <td><input value={day.kg || ''} onChange={(e) => updateDay(day.id, 'kg', e.target.value)} /></td>
                          <td><input value={day.platforms.migros.count || ''} onChange={(e) => updateDay(day.id, 'platforms', e.target.value, 'migros', 'count')} /></td>
                          <td><input value={day.platforms.migros.rev || ''} onChange={(e) => updateDay(day.id, 'platforms', e.target.value, 'migros', 'rev')} /></td>
                          <td><input value={day.platforms.getir.count || ''} onChange={(e) => updateDay(day.id, 'platforms', e.target.value, 'getir', 'count')} /></td>
                          <td><input value={day.platforms.getir.rev || ''} onChange={(e) => updateDay(day.id, 'platforms', e.target.value, 'getir', 'rev')} /></td>
                          <td><input value={day.platforms.yemeksepeti.count || ''} onChange={(e) => updateDay(day.id, 'platforms', e.target.value, 'yemeksepeti', 'count')} /></td>
                          <td><input value={day.platforms.yemeksepeti.rev || ''} onChange={(e) => updateDay(day.id, 'platforms', e.target.value, 'yemeksepeti', 'rev')} /></td>
                          <td><input value={day.platforms.trendyol.count || ''} onChange={(e) => updateDay(day.id, 'platforms', e.target.value, 'trendyol', 'count')} /></td>
                          <td><input value={day.platforms.trendyol.rev || ''} onChange={(e) => updateDay(day.id, 'platforms', e.target.value, 'trendyol', 'rev')} /></td>
                          <td className="ledger-highlight-col">{fmt(shopRow)}</td><td className="ledger-highlight-col">{onlineCountRow || ''}</td>
                          <td className="ledger-highlight-col">{fmt(onlineRow)}</td><td className="ledger-highlight-col">{avgKgPrice > 0 ? fmt(avgKgPrice) : '-'}</td>
                          <td className="ledger-highlight-col">{fmt(totalRow)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="ledger-tfoot-row">
                      <td style={{ textAlign: 'center' }}>TOPLAM</td>
                      <td>{fmt(monthData.days.reduce((a, b) => a + parseNumber(b.cash), 0))}</td>
                      <td>{fmt(monthData.days.reduce((a, b) => a + parseNumber(b.pos), 0))}</td>
                      <td>{fmt(monthData.days.reduce((a, b) => a + parseNumber(b.mealCard), 0))}</td>
                      <td>{fmt(totals.kg, 1)}</td>
                      <td>{monthData.days.reduce((a, b) => a + parseNumber(b.platforms.migros.count), 0)}</td>
                      <td>{fmt(monthData.days.reduce((a, b) => a + parseNumber(b.platforms.migros.rev), 0))}</td>
                      <td>{monthData.days.reduce((a, b) => a + parseNumber(b.platforms.getir.count), 0)}</td>
                      <td>{fmt(monthData.days.reduce((a, b) => a + parseNumber(b.platforms.getir.rev), 0))}</td>
                      <td>{monthData.days.reduce((a, b) => a + parseNumber(b.platforms.yemeksepeti.count), 0)}</td>
                      <td>{fmt(monthData.days.reduce((a, b) => a + parseNumber(b.platforms.yemeksepeti.rev), 0))}</td>
                      <td>{monthData.days.reduce((a, b) => a + parseNumber(b.platforms.trendyol.count), 0)}</td>
                      <td>{fmt(monthData.days.reduce((a, b) => a + parseNumber(b.platforms.trendyol.rev), 0))}</td>
                      <td>{fmt(totals.shop)}</td><td>{totals.onlineCount}</td><td>{fmt(totals.online)}</td>
                      <td>{totals.kg > 0 ? fmt(totals.grand / totals.kg) : '-'}</td>
                      <td>{fmt(totals.grand)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="ledger-right-panel">
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
                            value={monthData.margins?.shop || ''}
                            onChange={(e) => updateMargin('shop', e.target.value)}
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
                            value={monthData.margins?.online || ''}
                            onChange={(e) => updateMargin('online', e.target.value)}
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
                        value={monthData.rent || ''}
                        onChange={(e) => updateFixedCost('rent', e.target.value)}
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
                        value={monthData.electricity || ''}
                        onChange={(e) => updateFixedCost('electricity', e.target.value)}
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
                        value={monthData.water || ''}
                        onChange={(e) => updateFixedCost('water', e.target.value)}
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
                        value={monthData.accounting || ''}
                        onChange={(e) => updateFixedCost('accounting', e.target.value)}
                        placeholder="₺"
                      />
                      <span className="ledger-card-value" style={{ fontSize: '0.9rem' }}>₺</span>
                    </div>
                  </div>

                  {monthData.costs.map(cost => (
                    <div key={cost.id} className="ledger-summary-card" style={{ borderLeft: '4px solid var(--ledger-danger)', padding: '0.75rem 1rem' }}>
                      <input
                        className="ledger-premium-input"
                        style={{ background: 'transparent', border: 'none', width: '120px', padding: '0', fontSize: '0.85rem' }}
                        placeholder="Gider Adı..."
                        value={cost.name}
                        onChange={(e) => updateCost(cost.id, 'name', e.target.value)}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <input
                          type="number"
                          className="ledger-premium-input"
                          style={{ width: '70px', padding: '0.2rem 0.4rem', fontSize: '0.85rem', height: '30px', textAlign: 'right' }}
                          value={cost.amount || ''}
                          onChange={(e) => updateCost(cost.id, 'amount', e.target.value)}
                          placeholder="₺"
                        />
                        <button className="icon-btn" onClick={() => deleteCost(cost.id)} style={{ color: 'var(--ledger-danger)', padding: '0 0.2rem', fontSize: '1rem' }}>✕</button>
                      </div>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                    <button
                      className="primary-btn"
                      onClick={addCost}
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

              {['migros', 'getir', 'yemeksepeti', 'trendyol'].map(p => {
                const pRev = monthData.days.reduce((acc, d) => acc + ((d.platforms as any)[p].rev || 0), 0);
                const pCommRate = (monthData.commissions as any)?.[p] || 0;
                const pCommVal = pRev * (pCommRate / 100);
                const pAdVal = (monthData.platformAds as any)?.[p] || 0;
                const adWeightedComm = pRev > 0 ? ((pCommVal + pAdVal) / pRev) * 100 : 0;

                const pColors: any = { migros: '#f6821f', getir: '#5d3ebc', yemeksepeti: '#fa0050', trendyol: '#ff5a01' };

                return (
                  <div key={p} className="ledger-glass-panel" style={{ borderLeft: `4px solid ${pColors[p]}` }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', textTransform: 'capitalize' }}>{p}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--ledger-text-secondary)' }}>Komisyon (%)</label>
                        <input
                          type="number"
                          className="ledger-premium-input"
                          value={(monthData.commissions as any)?.[p] || ''}
                          onChange={(e) => updateCommission(p as any, e.target.value)}
                          placeholder="%"
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--ledger-text-secondary)' }}>Reklam (₺)</label>
                        <input
                          type="number"
                          className="ledger-premium-input"
                          value={(monthData.platformAds as any)?.[p] || ''}
                          onChange={(e) => updatePlatformAd(p as any, e.target.value)}
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
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
