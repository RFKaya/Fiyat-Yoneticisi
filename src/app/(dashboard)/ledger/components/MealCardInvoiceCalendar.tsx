import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import {
  MealCardInvoice,
  MEAL_CARD_PLATFORM_NAMES,
} from '../meal-card-invoices';

interface MealCardInvoiceCalendarProps {
  invoices: MealCardInvoice[];
  onToggle: (platform: MealCardInvoice['platform'], date: string) => void;
}

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

const groupInvoicesByDate = (invoices: MealCardInvoice[]) =>
  Object.entries(
    invoices.reduce<Record<string, MealCardInvoice[]>>((groups, invoice) => {
      (groups[invoice.date] ||= []).push(invoice);
      return groups;
    }, {})
  );

export function MealCardInvoiceCalendar({
  invoices,
  onToggle,
}: MealCardInvoiceCalendarProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [exitingInvoices, setExitingInvoices] = useState<Set<string>>(new Set());
  const exitTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const today = new Date().toLocaleDateString('en-CA');

  const completedCount = invoices.filter(invoice => invoice.completed).length;
  const dueInvoices = useMemo(
    () => invoices.filter(invoice => !invoice.completed && invoice.date <= today),
    [invoices, today]
  );
  const futureInvoices = useMemo(
    () => invoices.filter(invoice => !invoice.completed && invoice.date > today),
    [invoices, today]
  );
  const dueGroups = useMemo(() => groupInvoicesByDate(dueInvoices), [dueInvoices]);
  const futureGroups = useMemo(() => groupInvoicesByDate(futureInvoices), [futureInvoices]);
  const completedGroups = useMemo(
    () => groupInvoicesByDate(invoices.filter(invoice => invoice.completed)),
    [invoices]
  );

  useEffect(() => () => {
    exitTimeouts.current.forEach(clearTimeout);
  }, []);

  const handleToggle = (invoice: MealCardInvoice) => {
    const invoiceKey = `${invoice.platform}-${invoice.date}`;
    if (exitingInvoices.has(invoiceKey)) return;

    setExitingInvoices(current => new Set(current).add(invoiceKey));
    const timeout = setTimeout(() => {
      onToggle(invoice.platform, invoice.date);
      setExitingInvoices(current => {
        const next = new Set(current);
        next.delete(invoiceKey);
        return next;
      });
    }, 420);
    exitTimeouts.current.push(timeout);
  };

  const renderGroups = (
    groups: [string, MealCardInvoice[]][],
    completedSection = false
  ) => groups.map(([date, dayInvoices]) => {
    const isToday = date === today;
    const isPast = date < today;
    const dateClass = isToday
      ? 'ledger-row-today'
      : isPast
        ? 'ledger-row-past'
        : 'ledger-row-future';
    const isExiting = dayInvoices.every(invoice =>
      exitingInvoices.has(`${invoice.platform}-${invoice.date}`)
    );

    return (
      <div
        className={`meal-card-invoice-day ${dateClass}${isExiting ? ' is-exiting' : ''}`}
        key={`${completedSection ? 'completed' : 'pending'}-${date}`}
      >
        <div className="meal-card-invoice-day-header">
          <span>{formatDate(date)}</span>
        </div>

        <div className="meal-card-invoice-day-items">
          {dayInvoices.map(invoice => {
            const invoiceKey = `${invoice.platform}-${invoice.date}`;
            const invoiceIsExiting = exitingInvoices.has(invoiceKey);

            return (
              <label
                key={invoiceKey}
                className={`meal-card-invoice-item${invoice.completed ? ' is-completed' : ''}${invoiceIsExiting ? ' is-exiting' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={invoice.completed || invoiceIsExiting}
                  onChange={() => handleToggle(invoice)}
                  disabled={invoiceIsExiting}
                />
                <span className="meal-card-invoice-check" aria-hidden="true">
                  {(invoice.completed || invoiceIsExiting) && <Check size={14} strokeWidth={3} />}
                </span>
                <span className="meal-card-invoice-platform">
                  {MEAL_CARD_PLATFORM_NAMES[invoice.platform]}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    );
  });

  return (
    <section className="ledger-glass-panel meal-card-calendar">
      <div className="meal-card-calendar-header">
        <div>
          <h2>
            <CreditCard size={18} />
            Yemek Kartı Faturaları
          </h2>
          <p>Faturayı kestiğinizde işaretleyin.</p>
        </div>
        <span className="meal-card-calendar-progress">
          {completedCount}/{invoices.length}
        </span>
      </div>

      <button
        type="button"
        className="meal-card-completed-toggle"
        onClick={() => setShowCompleted(current => !current)}
        disabled={completedCount === 0}
      >
        <span>Kesilmiş faturalar ({completedCount})</span>
        {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showCompleted && completedCount > 0 && (
        <div className="meal-card-completed-section">
          {renderGroups(completedGroups, true)}
        </div>
      )}

      <div className="meal-card-calendar-list">
        {dueGroups.length > 0
          ? renderGroups(dueGroups)
          : <div className="meal-card-calendar-empty">Bugüne kadar bekleyen fatura yok.</div>}
      </div>

      <button
        type="button"
        className="meal-card-completed-toggle meal-card-future-toggle"
        onClick={() => setShowFuture(current => !current)}
        disabled={futureInvoices.length === 0}
      >
        <span>Gelecek faturalar ({futureInvoices.length})</span>
        {showFuture ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showFuture && futureInvoices.length > 0 && (
        <div className="meal-card-future-section">
          {renderGroups(futureGroups)}
        </div>
      )}
    </section>
  );
}
