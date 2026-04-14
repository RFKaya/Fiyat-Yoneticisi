'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import LoadingState from '@/components/layout/LoadingState';
import { pageLedgerLogger as log } from '@/lib/logger';
import './ledger.css';
import { LedgerTable } from './components/LedgerTable';
import { LedgerSummary } from './components/LedgerSummary';
import { PlatformSection } from './components/PlatformSection';

type PlatformData = { count: number | string; rev: number | string };
type DayData = {
  id?: string;
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
  const [isEditingShopMargin, setIsEditingShopMargin] = useState(false);
  const [isEditingOnlineMargin, setIsEditingOnlineMargin] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'waiting' | 'saving' | 'saved' | 'error'>('idle');

  const currentMonthKey = `${currentYear}-${currentMonth}`;
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isDirtyRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastSelectedShopId', currentShopId);
    }
    setSaveStatus('idle');
  }, [currentShopId]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current || saveStatus === 'waiting' || saveStatus === 'saving') {
        const msg = "Kaydedilmemiş değişiklikleriniz var. Ayrılmak istediğinize emin misiniz?";
        e.returnValue = msg;
        return msg;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [saveStatus]);

  useEffect(() => {
    fetch('/api/shops')
      .then((res) => res.json())
      .then(data => setShops(data))
      .catch(error => log.error('Dükkan listesi yüklenemedi!', { message: error.message }));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/ledger?shop=${currentShopId}`)
      .then((res) => res.json())
      .then(data => {
        setShopData(data);
        setIsLoading(false);
      })
      .catch(error => {
        log.error('Ledger verisi yüklenemedi!', { shopId: currentShopId, message: error.message });
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
          date: dateStr, cash: 0, pos: 0, mealCard: 1, kg: 0,
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
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (isLoading || !shopData || !shopData.months || Object.keys(shopData.months).length === 0) return;
    if (!isDirtyRef.current) return;

    const activeMonthData = shopData.months[currentMonthKey] || monthData;
    setSaveStatus('waiting');

    saveTimeoutRef.current = setTimeout(() => {
      isDirtyRef.current = false;
      setSaveStatus('saving');
      fetch(`/api/ledger?shop=${currentShopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthKey: currentMonthKey, monthData: activeMonthData })
      })
        .then((res) => {
          if (!res.ok) throw new Error('Kısmi kayıt başarısız');
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 3000);
        })
        .catch(() => setSaveStatus('error'));
    }, 1000);

    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [shopData, currentShopId, currentMonthKey, monthData, isLoading]);

  const updateDay = (id: string, field: string, value: string, platform?: keyof DayData['platforms'], pField?: keyof PlatformData) => {
    isDirtyRef.current = true;
    const filteredValue = value.replace(/[^0-9,.]/g, '');
    setShopData(prev => {
      const currentMonths = prev.months || {};
      const currentMonthData = currentMonths[currentMonthKey] || monthData;
      const days = [...currentMonthData.days];
      const dayIndex = days.findIndex(d => d.date === id);
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

      res.shop += shopRow; res.online += onlineRow; res.onlineCount += onlineCountRow;
      res.kg += parseNumber(d.kg); res.grand += (shopRow + onlineRow); res.commissions += dayComm;
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
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
  };

  const updateActions = {
    onUpdateFixedCost: (field: any, value: string) => {
      isDirtyRef.current = true;
      setShopData(prev => {
        const currentMonths = prev.months || {};
        const currentMonthData = currentMonths[currentMonthKey] || monthData;
        return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, [field]: parseFloat(value) || 0 } } };
      });
    },
    onUpdateCost: (id: string, field: string, value: string) => {
      isDirtyRef.current = true;
      setShopData(prev => {
        const currentMonths = prev.months || {};
        const currentMonthData = currentMonths[currentMonthKey] || monthData;
        const costs = currentMonthData.costs.map(c => c.id === id ? { ...c, [field]: field === 'amount' ? value.replace(/[^0-9,.]/g, '') : value } : c);
        return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, costs } } };
      });
    },
    onDeleteCost: (id: string) => {
      isDirtyRef.current = true;
      setShopData(prev => {
        const currentMonths = prev.months || {};
        const currentMonthData = currentMonths[currentMonthKey] || monthData;
        const costs = currentMonthData.costs.filter(c => c.id !== id);
        return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, costs } } };
      });
    },
    onAddCost: () => {
      isDirtyRef.current = true;
      setShopData(prev => {
        const currentMonths = prev.months || {};
        const currentMonthData = currentMonths[currentMonthKey] || monthData;
        const costs = [...currentMonthData.costs, { id: generateId(), name: '', amount: 0 }];
        return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, costs } } };
      });
    },
    onUpdateMargin: (type: 'shop' | 'online', value: string) => {
      isDirtyRef.current = true;
      setShopData(prev => {
        const currentMonths = prev.months || {};
        const currentMonthData = currentMonths[currentMonthKey] || monthData;
        const margins = { ...(currentMonthData.margins || { shop: 0, online: 0 }), [type]: parseFloat(value) || 0 };
        return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, margins } } };
      });
    },
    onUpdateCommission: (platform: any, value: string) => {
      isDirtyRef.current = true;
      setShopData(prev => {
        const currentMonths = prev.months || {};
        const currentMonthData = currentMonths[currentMonthKey] || monthData;
        const commissions = { ...(currentMonthData.commissions || { migros: 0, getir: 0, yemeksepeti: 0, trendyol: 0 }), [platform]: parseFloat(value) || 0 };
        return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, commissions } } };
      });
    },
    onUpdatePlatformAd: (platform: any, value: string) => {
      isDirtyRef.current = true;
      setShopData(prev => {
        const currentMonths = prev.months || {};
        const currentMonthData = currentMonths[currentMonthKey] || monthData;
        const platformAds = { ...(currentMonthData.platformAds || { migros: 0, getir: 0, yemeksepeti: 0, trendyol: 0 }), [platform]: parseFloat(value) || 0 };
        return { ...prev, months: { ...currentMonths, [currentMonthKey]: { ...currentMonthData, platformAds } } };
      });
    }
  };

  return (
    <div className="ledger-container">
      {isLoading && <LoadingState fullPage={true} />}
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
                    <button key={m.id} className={currentMonth === m.id ? 'active' : ''} onClick={() => setCurrentMonth(m.id)}>{m.name}</button>
                  ))}
                </div>
              </div>
            </div>
          </header>

          <div className="ledger-main-layout">
            <div className="ledger-glass-panel ledger-table-panel">
              <div className="ledger-panel-header">
                <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
                  {shopData.shopName || shops.find(s => s.id === currentShopId)?.name || 'İşyeri'}
                </h2>
                <div className={`ledger-save-indicator status-${saveStatus}`}>
                  {saveStatus === 'waiting' && <span className="status-waiting">🕒 Kayıt bekliyor...</span>}
                  {saveStatus === 'saving' && <span className="status-saving animate-pulse">🔄 Kaydediliyor...</span>}
                  {saveStatus === 'saved' && <span className="status-saved">✅ Kaydedildi</span>}
                  {saveStatus === 'error' && <span className="status-error">❌ Kayıt hatası!</span>}
                </div>
              </div>
              <LedgerTable days={monthData.days} onUpdateDay={updateDay} parseNumber={parseNumber} fmt={fmt} />
            </div>

            <div className="ledger-right-panel">
              <LedgerSummary
                totals={totals} costs={monthData.costs} fmt={fmt} {...updateActions}
                isEditingShopMargin={isEditingShopMargin} setIsEditingShopMargin={setIsEditingShopMargin}
                isEditingOnlineMargin={isEditingOnlineMargin} setIsEditingOnlineMargin={setIsEditingOnlineMargin}
              />

              {['migros', 'getir', 'yemeksepeti', 'trendyol'].map(p => (
                <PlatformSection
                  key={p} platform={p} rev={parseNumber((monthData.days.reduce((acc, d: any) => acc + parseNumber(d.platforms[p].rev), 0)))}
                  commRate={(monthData.commissions as any)?.[p] || 0} adVal={(monthData.platformAds as any)?.[p] || 0}
                  onUpdateCommission={updateActions.onUpdateCommission} onUpdatePlatformAd={updateActions.onUpdatePlatformAd}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
