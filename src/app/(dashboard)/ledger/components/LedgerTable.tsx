import React from 'react';

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

interface LedgerTableProps {
  days: DayData[];
  onUpdateDay: (id: string, field: string, value: string, platform?: keyof DayData['platforms'], pField?: keyof PlatformData) => void;
  parseNumber: (v: any) => number;
  fmt: (v: any, decimals?: number) => string;
}

export function LedgerTable({ days, onUpdateDay, parseNumber, fmt }: LedgerTableProps) {
  return (
    <div className="ledger-table-responsive">
      <table className="ledger-modern-table">
        <colgroup>
          <col style={{ width: '80px' }} /><col style={{ width: '65px' }} /><col style={{ width: '65px' }} /><col style={{ width: '65px' }} /><col style={{ width: '50px' }} /><col style={{ width: '40px' }} /><col style={{ width: '65px' }} /><col style={{ width: '40px' }} /><col style={{ width: '65px' }} /><col style={{ width: '40px' }} /><col style={{ width: '65px' }} /><col style={{ width: '40px' }} /><col style={{ width: '65px' }} /><col style={{ width: '65px' }} /><col style={{ width: '50px' }} /><col style={{ width: '65px' }} /><col style={{ width: '60px' }} /><col style={{ width: '70px' }} />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2}>Tarih</th>
            <th rowSpan={2}>Nakit</th>
            <th rowSpan={2}>POS</th>
            <th rowSpan={2}>Yemek Kartı</th>
            <th rowSpan={2}>Kg</th>
            <th colSpan={2} className="platform-migros">Migros</th>
            <th colSpan={2} className="platform-getir">Getir</th>
            <th colSpan={2} className="platform-yemeksepeti">Yemeksepeti</th>
            <th colSpan={2} className="platform-trendyol">Trendyol</th>
            <th rowSpan={2} className="ledger-highlight-col">Dükkan Ciro</th>
            <th rowSpan={2} className="ledger-highlight-col">Online Adet</th>
            <th rowSpan={2} className="ledger-highlight-col">Online Ciro</th>
            <th rowSpan={2} className="ledger-highlight-col">Ort.₺/Kg</th>
            <th rowSpan={2} className="ledger-highlight-col">Toplam Ciro</th>
          </tr>
          <tr>
            <th>Ad.</th><th>₺</th><th>Ad.</th><th>₺</th><th>Ad.</th><th>₺</th><th>Ad.</th><th>₺</th>
          </tr>
        </thead>
        <tbody>
          {days.map(day => {
            const todayStr = new Date().toLocaleDateString('en-CA');
            const isToday = day.date === todayStr;
            const isPast = day.date < todayStr;

            const shopRow = parseNumber(day.cash) + parseNumber(day.pos) + parseNumber(day.mealCard);
            const onlineRow = parseNumber(day.platforms.migros.rev) + parseNumber(day.platforms.getir.rev) + parseNumber(day.platforms.yemeksepeti.rev) + parseNumber(day.platforms.trendyol.rev);
            const onlineCountRow = parseNumber(day.platforms.migros.count) + parseNumber(day.platforms.getir.count) + parseNumber(day.platforms.yemeksepeti.count) + parseNumber(day.platforms.trendyol.count);
            const totalRow = shopRow + onlineRow;
            const avgKgPrice = parseNumber(day.kg) > 0 ? totalRow / parseNumber(day.kg) : 0;

            return (
              <tr key={day.date} className={`${isToday ? 'ledger-row-today' : ''} ${isPast ? 'ledger-row-past' : ''}`}>
                <td style={{ textAlign: 'center' }}>{day.date.split('-').reverse().join('.')}</td>
                <td><input value={day.cash || ''} onChange={(e) => onUpdateDay(day.date, 'cash', e.target.value)} /></td>
                <td><input value={day.pos || ''} onChange={(e) => onUpdateDay(day.date, 'pos', e.target.value)} /></td>
                <td><input value={day.mealCard || ''} onChange={(e) => onUpdateDay(day.date, 'mealCard', e.target.value)} /></td>
                <td><input value={day.kg || ''} onChange={(e) => onUpdateDay(day.date, 'kg', e.target.value)} /></td>
                <td><input value={day.platforms.migros.count || ''} onChange={(e) => onUpdateDay(day.date, 'platforms', e.target.value, 'migros', 'count')} /></td>
                <td><input value={day.platforms.migros.rev || ''} onChange={(e) => onUpdateDay(day.date, 'platforms', e.target.value, 'migros', 'rev')} /></td>
                <td><input value={day.platforms.getir.count || ''} onChange={(e) => onUpdateDay(day.date, 'platforms', e.target.value, 'getir', 'count')} /></td>
                <td><input value={day.platforms.getir.rev || ''} onChange={(e) => onUpdateDay(day.date, 'platforms', e.target.value, 'getir', 'rev')} /></td>
                <td><input value={day.platforms.yemeksepeti.count || ''} onChange={(e) => onUpdateDay(day.date, 'platforms', e.target.value, 'yemeksepeti', 'count')} /></td>
                <td><input value={day.platforms.yemeksepeti.rev || ''} onChange={(e) => onUpdateDay(day.date, 'platforms', e.target.value, 'yemeksepeti', 'rev')} /></td>
                <td><input value={day.platforms.trendyol.count || ''} onChange={(e) => onUpdateDay(day.date, 'platforms', e.target.value, 'trendyol', 'count')} /></td>
                <td><input value={day.platforms.trendyol.rev || ''} onChange={(e) => onUpdateDay(day.date, 'platforms', e.target.value, 'trendyol', 'rev')} /></td>
                <td className="ledger-highlight-col">{fmt(shopRow)}</td>
                <td className="ledger-highlight-col">{onlineCountRow || ''}</td>
                <td className="ledger-highlight-col">{fmt(onlineRow)}</td>
                <td className="ledger-highlight-col">{avgKgPrice > 0 ? fmt(avgKgPrice) : '-'}</td>
                <td className="ledger-highlight-col">{fmt(totalRow)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="ledger-tfoot-row">
            <td style={{ textAlign: 'center' }}>TOPLAM</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.cash), 0))}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.pos), 0))}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.mealCard), 0))}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.kg), 0), 1)}</td>
            <td>{days.reduce((a, b) => a + parseNumber(b.platforms.migros.count), 0)}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.platforms.migros.rev), 0))}</td>
            <td>{days.reduce((a, b) => a + parseNumber(b.platforms.getir.count), 0)}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.platforms.getir.rev), 0))}</td>
            <td>{days.reduce((a, b) => a + parseNumber(b.platforms.yemeksepeti.count), 0)}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.platforms.yemeksepeti.rev), 0))}</td>
            <td>{days.reduce((a, b) => a + parseNumber(b.platforms.trendyol.count), 0)}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.platforms.trendyol.rev), 0))}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.cash) + parseNumber(b.pos) + parseNumber(b.mealCard), 0))}</td>
            <td>{days.reduce((a, b) => a + parseNumber(b.platforms.migros.count) + parseNumber(b.platforms.getir.count) + parseNumber(b.platforms.yemeksepeti.count) + parseNumber(b.platforms.trendyol.count), 0)}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.platforms.migros.rev) + parseNumber(b.platforms.getir.rev) + parseNumber(b.platforms.yemeksepeti.rev) + parseNumber(b.platforms.trendyol.rev), 0))}</td>
            <td>{days.reduce((a, b) => a + parseNumber(b.kg), 0) > 0 ? fmt(days.reduce((a, b) => a + parseNumber(b.cash) + parseNumber(b.pos) + parseNumber(b.mealCard) + parseNumber(b.platforms.migros.rev) + parseNumber(b.platforms.getir.rev) + parseNumber(b.platforms.yemeksepeti.rev) + parseNumber(b.platforms.trendyol.rev), 0) / days.reduce((a, b) => a + parseNumber(b.kg), 0)) : '-'}</td>
            <td>{fmt(days.reduce((a, b) => a + parseNumber(b.cash) + parseNumber(b.pos) + parseNumber(b.mealCard) + parseNumber(b.platforms.migros.rev) + parseNumber(b.platforms.getir.rev) + parseNumber(b.platforms.yemeksepeti.rev) + parseNumber(b.platforms.trendyol.rev), 0))}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
