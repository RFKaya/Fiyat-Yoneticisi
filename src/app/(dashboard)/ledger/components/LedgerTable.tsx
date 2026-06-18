import React, { Fragment, useState } from 'react';
import { ChevronRight, Plus, Trash2 } from 'lucide-react';

type PlatformData = { count: number | string; rev: number | string };
type DailyFlowData = {
  opening: number | string;
  closing: number | string;
  movements: FlowMovement[];
};
type FlowMovement = {
  id: string;
  direction: 'incoming' | 'outgoing';
  title: string;
  amount: number | string;
};
type MealCardPayment = {
  id: string;
  amount: number | string;
};
type DayData = {
  id?: string;
  date: string;
  cash: number | string;
  pos: number | string;
  mealCard: number | string;
  note?: string;
  mealCardPayments?: MealCardPayment[];
  kg: number | string;
  dailyDetails?: {
    cash: DailyFlowData;
    kg: DailyFlowData;
  };
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
  onUpdateDayDetail: (
    id: string,
    group: keyof NonNullable<DayData['dailyDetails']>,
    field: Exclude<keyof DailyFlowData, 'movements'>,
    value: string
  ) => void;
  onAddFlowMovement: (
    id: string,
    direction: FlowMovement['direction']
  ) => void;
  onUpdateFlowMovement: (
    id: string,
    movementId: string,
    field: 'title' | 'amount',
    value: string
  ) => void;
  onDeleteFlowMovement: (
    id: string,
    movementId: string
  ) => void;
  onAddMealCardPayment: (id: string) => void;
  onUpdateMealCardPayment: (
    id: string,
    paymentId: string,
    value: string
  ) => void;
  onDeleteMealCardPayment: (id: string, paymentId: string) => void;
  onUpdateDayNote: (id: string, value: string) => void;
  parseNumber: (v: any) => number;
  fmt: (v: any, decimals?: number) => string;
}

const emptyFlow: DailyFlowData = {
  opening: 0,
  closing: 0,
  movements: [],
};

export function LedgerTable({
  days,
  onUpdateDay,
  onUpdateDayDetail,
  onAddFlowMovement,
  onUpdateFlowMovement,
  onDeleteFlowMovement,
  onAddMealCardPayment,
  onUpdateMealCardPayment,
  onDeleteMealCardPayment,
  onUpdateDayNote,
  parseNumber,
  fmt,
}: LedgerTableProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set());

  const parseExpression = (value: number | string) => String(value || '')
    .split('+')
    .reduce((total, part) => total + parseNumber(part.trim()), 0);

  const toggleDay = (date: string) => {
    setExpandedDays(current => {
      const next = new Set(current);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const calculateDetail = (day: DayData, field: 'cash' | 'kg', details: DailyFlowData) => {
    const incoming = (details.movements || [])
      .filter(movement => movement.direction === 'incoming')
      .reduce((sum, movement) => sum + parseExpression(movement.amount), 0);
    const outgoing = (details.movements || [])
      .filter(movement => movement.direction === 'outgoing')
      .reduce((sum, movement) => sum + parseExpression(movement.amount), 0);
    const total =
      outgoing +
      parseExpression(details.closing) -
      parseExpression(details.opening) -
      incoming;

    onUpdateDay(day.date, field, String(total));
  };

  const calculateMealCard = (day: DayData) => {
    const total = (day.mealCardPayments || []).reduce(
      (sum, payment) => sum + parseExpression(payment.amount),
      0
    );
    onUpdateDay(day.date, 'mealCard', String(total));
  };

  return (
    <div className="ledger-table-responsive">
      <table className="ledger-modern-table">
        <colgroup>
          <col style={{ width: '36px' }} /><col style={{ width: '80px' }} /><col style={{ width: '65px' }} /><col style={{ width: '65px' }} /><col style={{ width: '65px' }} /><col style={{ width: '50px' }} /><col style={{ width: '40px' }} /><col style={{ width: '65px' }} /><col style={{ width: '40px' }} /><col style={{ width: '65px' }} /><col style={{ width: '40px' }} /><col style={{ width: '65px' }} /><col style={{ width: '40px' }} /><col style={{ width: '65px' }} /><col style={{ width: '65px' }} /><col style={{ width: '50px' }} /><col style={{ width: '65px' }} /><col style={{ width: '60px' }} /><col style={{ width: '70px' }} />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={2} aria-label="Günlük detay" />
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
            const isExpanded = expandedDays.has(day.date);
            const dailyDetails = day.dailyDetails || { cash: emptyFlow, kg: emptyFlow };

            return (
              <Fragment key={day.date}>
                <tr className={`${isToday ? 'ledger-row-today' : ''} ${isPast ? 'ledger-row-past' : ''}`}>
                  <td className="ledger-expand-cell">
                    <button
                      type="button"
                      className={`ledger-expand-button ${isExpanded ? 'is-expanded' : ''}`}
                      onClick={() => toggleDay(day.date)}
                      aria-expanded={isExpanded}
                      aria-controls={`ledger-day-details-${day.date}`}
                      aria-label={`${day.date} günlük detaylarını ${isExpanded ? 'kapat' : 'aç'}`}
                    >
                      <ChevronRight size={17} />
                    </button>
                  </td>
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
                {isExpanded && (
                  <tr id={`ledger-day-details-${day.date}`} className="ledger-day-detail-row">
                    <td colSpan={19}>
                      <div className="ledger-day-detail-content">
                        {([
                          ['cash', 'Kasa Nakiti', '₺'],
                          ['kg', 'KG', 'kg'],
                        ] as const).map(([group, title, unit]) => (
                          <section className="ledger-day-detail-group" key={group}>
                            <div className="ledger-day-detail-header">
                              <h3>{title}</h3>
                              <button
                                type="button"
                                className="ledger-calculate-button"
                                onClick={() => calculateDetail(day, group, dailyDetails[group])}
                              >
                                Hesapla
                              </button>
                            </div>
                            <div className="ledger-day-detail-fields">
                              {([
                                ['opening', 'Açılış'],
                                ['closing', 'Kapanış'],
                              ] as const).map(([field, label]) => (
                                <label className="ledger-balance-row" key={field}>
                                  <span>{label}</span>
                                  <div className={`ledger-detail-input-wrap ledger-detail-${field}`}>
                                    <input
                                      inputMode="decimal"
                                      value={dailyDetails[group][field] || ''}
                                      onChange={(event) => onUpdateDayDetail(day.date, group, field, event.target.value)}
                                      aria-label={`${title} ${label}`}
                                    />
                                    <span>{unit}</span>
                                  </div>
                                </label>
                              ))}

                              {group === 'cash' && ([
                                ['incoming', 'Kasaya nakit eklendi'],
                                ['outgoing', 'Kasadan para alındı'],
                              ] as const).map(([direction, buttonLabel]) => (
                                <div className={`ledger-flow-section ledger-flow-${direction}`} key={direction}>
                                  <button
                                    type="button"
                                    className="ledger-add-flow-button"
                                    onClick={() => onAddFlowMovement(day.date, direction)}
                                  >
                                    <Plus size={14} />
                                    {buttonLabel}
                                  </button>
                                  {(dailyDetails[group].movements || [])
                                    .filter(movement => movement.direction === direction)
                                    .map(movement => (
                                      <div className="ledger-flow-movement-row" key={movement.id}>
                                        <input
                                          className="ledger-flow-title"
                                          value={movement.title}
                                          onChange={(event) => onUpdateFlowMovement(
                                            day.date, movement.id, 'title', event.target.value
                                          )}
                                          placeholder="Başlık"
                                          aria-label={`${title} hareket başlığı`}
                                        />
                                        <div className="ledger-flow-amount">
                                          <input
                                            inputMode="decimal"
                                            value={movement.amount || ''}
                                            onChange={(event) => onUpdateFlowMovement(
                                              day.date, movement.id, 'amount', event.target.value
                                            )}
                                            placeholder="Tutar"
                                            aria-label={`${title} hareket tutarı`}
                                          />
                                          <span>{unit}</span>
                                        </div>
                                        <button
                                          type="button"
                                          className="ledger-delete-payment-button"
                                          onClick={() => onDeleteFlowMovement(day.date, movement.id)}
                                          aria-label={`${title} hareketini sil`}
                                        >
                                          <Trash2 size={15} />
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              ))}
                            </div>
                          </section>
                        ))}
                        <section className="ledger-day-detail-group ledger-meal-card-detail">
                          <div className="ledger-day-detail-header">
                            <div>
                              <h3>Yemek Kartı</h3>
                            </div>
                            <div className="ledger-meal-card-actions">
                              <button
                                type="button"
                                className="ledger-add-payment-button"
                                onClick={() => onAddMealCardPayment(day.date)}
                              >
                                <Plus size={14} />
                                Ödeme Ekle
                              </button>
                              <button
                                type="button"
                                className="ledger-calculate-button"
                                onClick={() => calculateMealCard(day)}
                              >
                                Hesapla
                              </button>
                            </div>
                          </div>
                          <div className="ledger-meal-card-payments">
                            {(day.mealCardPayments || []).length === 0 ? (
                              <p className="ledger-meal-card-empty">Henüz yemek kartı ödemesi eklenmedi.</p>
                            ) : (
                              (day.mealCardPayments || []).map((payment, index) => (
                                <div className="ledger-meal-card-payment-row" key={payment.id}>
                                  <span className="ledger-payment-index">{index + 1}</span>
                                  <div className="ledger-payment-amount">
                                    <input
                                      inputMode="decimal"
                                      value={payment.amount || ''}
                                      onChange={(event) => onUpdateMealCardPayment(
                                        day.date,
                                        payment.id,
                                        event.target.value
                                      )}
                                      placeholder="Tutar"
                                      aria-label={`${index + 1}. yemek kartı ödemesi tutarı`}
                                    />
                                    <span>₺</span>
                                  </div>
                                  <button
                                    type="button"
                                    className="ledger-delete-payment-button"
                                    onClick={() => onDeleteMealCardPayment(day.date, payment.id)}
                                    aria-label={`${index + 1}. yemek kartı ödemesini sil`}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </section>
                        <section className="ledger-day-detail-group ledger-note-detail">
                          <div className="ledger-day-detail-header">
                            <h3>Not</h3>
                          </div>
                          <textarea
                            value={day.note || ''}
                            onChange={(event) => onUpdateDayNote(day.date, event.target.value)}
                            placeholder="Bu günle ilgili notunuzu yazın..."
                            aria-label={`${day.date} günlük not`}
                          />
                        </section>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="ledger-tfoot-row">
            <td />
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
