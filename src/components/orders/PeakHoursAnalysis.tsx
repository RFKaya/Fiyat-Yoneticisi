'use client';

import React from 'react';
import {
  AlertCircle, BarChart3, CalendarDays, Clock, Flame, Lightbulb,
  Moon, TrendingUp
} from 'lucide-react';
import { ParsedOrder } from '@/lib/orders/types';
import { cn, formatCurrency } from '@/lib/utils';
import type { OrderAnalysis } from '@/lib/orders/orderAnalytics';

const DAY_NAMES = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
const SHORT_DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const WORKING_HOURS_STORAGE_KEY = 'ordersPeakHoursWorkingHours';
const SLOT_SIZE_STORAGE_KEY = 'ordersPeakHoursSlotSize';
const DAY_MINUTES = 24 * 60;
const TIME_OPTIONS = Array.from({ length: 49 }, (_, index) => index * 30);
const SLOT_SIZE_OPTIONS = [
  { value: 30, label: '30 dk' },
  { value: 60, label: '1 saat' },
  { value: 120, label: '2 saat' },
] as const;

type SlotSize = 30 | 60 | 120;

interface PeakHoursAnalysisProps {
  filteredOrders: ParsedOrder[];
  analyses: OrderAnalysis[];
}

interface WorkingHour {
  isOpen: boolean;
  start: number;
  end: number;
}

interface TimeSlot {
  start: number;
  end: number;
  label: string;
}

interface ActiveOrderRow {
  order: ParsedOrder;
  analysis?: OrderAnalysis;
  dayIndex: number;
  minuteOfDay: number;
  slotStart: number;
  revenue: number;
  isWithinWorkingHours: boolean;
}

interface SlotStat {
  slot: TimeSlot;
  count: number;
  revenue: number;
  avgBasket: number;
  dayCoverage: number;
}

interface DayStat {
  dayIndex: number;
  count: number;
  revenue: number;
  avgBasket: number;
  peakSlot: TimeSlot | null;
}

const DEFAULT_WORKING_HOURS: WorkingHour[] = [
  { isOpen: true, start: 11 * 60 + 30, end: 23 * 60 + 30 },
  { isOpen: true, start: 11 * 60 + 30, end: 23 * 60 + 30 },
  { isOpen: true, start: 11 * 60 + 30, end: 23 * 60 + 30 },
  { isOpen: true, start: 11 * 60 + 30, end: 23 * 60 + 30 },
  { isOpen: true, start: 11 * 60 + 30, end: 23 * 60 + 30 },
  { isOpen: true, start: 12 * 60, end: 23 * 60 + 30 },
  { isOpen: true, start: 14 * 60, end: 23 * 60 + 30 },
];

export function PeakHoursAnalysis({ filteredOrders, analyses }: PeakHoursAnalysisProps) {
  const [workingHours, setWorkingHours] = React.useState<WorkingHour[]>(DEFAULT_WORKING_HOURS);
  const [slotSize, setSlotSize] = React.useState<SlotSize>(60);

  React.useEffect(() => {
    try {
      const storedWorkingHours = window.localStorage.getItem(WORKING_HOURS_STORAGE_KEY);
      if (storedWorkingHours) {
        const parsed = JSON.parse(storedWorkingHours);
        if (Array.isArray(parsed) && parsed.length === 7) {
          setWorkingHours(parsed.map((row, index) => normalizeWorkingHour(row, DEFAULT_WORKING_HOURS[index])));
        }
      }

      const storedSlotSize = Number(window.localStorage.getItem(SLOT_SIZE_STORAGE_KEY));
      if (isSlotSize(storedSlotSize)) {
        setSlotSize(storedSlotSize);
      }
    } catch {
      setWorkingHours(DEFAULT_WORKING_HOURS);
      setSlotSize(60);
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(WORKING_HOURS_STORAGE_KEY, JSON.stringify(workingHours));
    } catch { }
  }, [workingHours]);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(SLOT_SIZE_STORAGE_KEY, String(slotSize));
    } catch { }
  }, [slotSize]);

  const model = React.useMemo(
    () => buildPeakHoursModel(filteredOrders, analyses, workingHours, slotSize),
    [filteredOrders, analyses, workingHours, slotSize]
  );

  const updateWorkingHour = (dayIndex: number, patch: Partial<WorkingHour>) => {
    setWorkingHours(prev => prev.map((row, index) => {
      if (index !== dayIndex) return row;

      const next = { ...row, ...patch };
      if (next.end <= next.start) {
        next.end = Math.min(DAY_MINUTES, next.start + 30);
      }
      return next;
    }));
  };

  const resetWorkingHours = () => setWorkingHours(DEFAULT_WORKING_HOURS);

  if (model.activeRows.length === 0) {
    return (
      <div className="glass-panel p-12 text-center flex flex-col items-center justify-center text-muted-foreground gap-3">
        <Clock className="h-12 w-12 opacity-20 text-primary animate-pulse" />
        <h3 className="font-semibold text-lg text-foreground">Henüz Saat Analizi Yok</h3>
        <p className="text-sm max-w-md">
          Seçilen tarih aralığında aktif sipariş bulununca haftanın günü ve saat bazında yoğunluk analizi burada görünür.
        </p>
      </div>
    );
  }

  const busiestSlotLabel = model.busiestSlot ? model.busiestSlot.slot.label : '-';
  const quietSlotsText = model.quietWorkingSlots.length > 0
    ? model.quietWorkingSlots.map(stat => stat.slot.label).join(', ')
    : 'Açık zamanlarda belirgin boş aralık yok';

  return (
    <div className="space-y-6">
      <div className="glass-panel overflow-hidden">
        <div className="p-6 border-b border-border bg-card/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Yoğun Saatler Analizi
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Siparişlerin gün ve saat dağılımını, çalışma saati içindeki boşlukları ve yoğunluk fırsatlarını gösterir.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <MetricTile label="Aktif Sipariş" value={model.activeRows.length.toString()} icon={BarChart3} />
            <MetricTile label="En Yoğun Aralık" value={busiestSlotLabel} icon={Flame} tone="hot" />
            <MetricTile label="Ort. Sepet" value={formatCurrency(model.averageBasket)} icon={TrendingUp} tone="good" />
            <MetricTile label="Verili Gün" value={model.uniqueDateCount.toString()} icon={CalendarDays} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <WorkingHoursEditor
              workingHours={workingHours}
              onChange={updateWorkingHour}
              onReset={resetWorkingHours}
            />
            <ResolutionControl value={slotSize} onChange={setSlotSize} />
          </div>

          {model.outOfHoursOrders.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  Çalışma saati dışında {model.outOfHoursOrders.length} sipariş görünüyor.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Bu siparişler listede kalır, ancak yoğun saat ve sessiz saat önerilerinde beklenti oluşturmaz.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="font-bold text-sm">Haftalık Yoğunluk Haritası</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Sadece haftada en az bir gün açık olan aralıklar gösterilir; tamamen kapalı aralıklar otomatik gizlenir.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>Düşük</span>
                  <div className="flex gap-1">
                    {[0.15, 0.35, 0.55, 0.75, 1].map((opacity) => (
                      <span key={opacity} className="w-4 h-3 rounded-sm bg-primary" style={{ opacity }} />
                    ))}
                  </div>
                  <span>Yüksek</span>
                </div>
              </div>

              <Heatmap
                slots={model.visibleSlots}
                matrix={model.matrix}
                maxCellCount={model.maxCellCount}
                workingHours={workingHours}
              />
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <InsightPanel
                title="Çalışma Saati Sinyalleri"
                icon={Lightbulb}
                items={model.recommendations}
              />
              <div className="rounded-xl border border-border/50 bg-card/25 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Moon className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-bold text-sm">Veriye Göre Önerilen Pencere</h4>
                </div>
                <div className="space-y-2">
                  {model.workingWindows.map(row => (
                    <div key={row.dayIndex} className="grid grid-cols-[88px_1fr] gap-3 text-xs">
                      <span className="font-semibold text-muted-foreground">{DAY_NAMES[row.dayIndex]}</span>
                      <span className={cn('font-bold text-right', row.count > 0 ? 'text-foreground' : 'text-muted-foreground/60')}>
                        {row.label}
                        {row.edgeNote && (
                          <span className="block text-[10px] font-medium text-muted-foreground mt-0.5">
                            {row.edgeNote}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Gün ortasındaki boşluklar kapatma önerisi sayılmaz; yalnızca açılış ve kapanış kenarları not edilir.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <StatsTable
              title="Zaman Aralığı Sıralaması"
              columns={['Aralık', 'Sipariş', 'Ciro', 'Ort. Sepet', 'Gün Kapsamı']}
              rows={model.slotStats.map(stat => [
                stat.slot.label,
                stat.count.toString(),
                formatCurrency(stat.revenue),
                formatCurrency(stat.avgBasket),
                `%${stat.dayCoverage.toFixed(0)}`,
              ])}
              highlightFirst
            />
            <StatsTable
              title="Gün Bazlı Sıralama"
              columns={['Gün', 'Sipariş', 'Ciro', 'Ort. Sepet', 'Zirve Aralık']}
              rows={model.dayStats.map(stat => [
                DAY_NAMES[stat.dayIndex],
                stat.count.toString(),
                formatCurrency(stat.revenue),
                formatCurrency(stat.avgBasket),
                stat.peakSlot?.label ?? '-',
              ])}
              highlightFirst
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkingHoursEditor({
  workingHours,
  onChange,
  onReset,
}: {
  workingHours: WorkingHour[];
  onChange: (dayIndex: number, patch: Partial<WorkingHour>) => void;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/25 overflow-hidden h-full">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h4 className="font-bold text-sm">Çalışma Saatleri</h4>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="h-8 px-3 rounded-md border border-border/60 bg-background/50 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-background"
        >
          Varsayılana Dön
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 p-4">
        {workingHours.map((row, dayIndex) => (
          <div key={dayIndex} className="rounded-lg border border-border/40 bg-background/30 p-3 space-y-3">
            <label className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">{DAY_NAMES[dayIndex]}</span>
              <input
                type="checkbox"
                checked={row.isOpen}
                onChange={(event) => onChange(dayIndex, { isOpen: event.target.checked })}
                className="h-4 w-4 accent-primary"
                aria-label={`${DAY_NAMES[dayIndex]} açık mı`}
              />
            </label>
            <div className={cn('grid grid-cols-2 gap-2', !row.isOpen && 'opacity-40 pointer-events-none')}>
              <TimeSelect
                label="Açılış"
                value={row.start}
                max={DAY_MINUTES - 30}
                onChange={(value) => onChange(dayIndex, { start: value })}
              />
              <TimeSelect
                label="Kapanış"
                value={row.end}
                min={row.start + 30}
                onChange={(value) => onChange(dayIndex, { end: value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResolutionControl({
  value,
  onChange,
}: {
  value: SlotSize;
  onChange: (value: SlotSize) => void;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/25 p-4 h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <div>
            <h4 className="font-bold text-sm">Tablo Aralığı</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tabloyu 30 dakikalık, saatlik veya 2 saatlik parçalarla genişletip daraltır.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 w-full md:w-[280px]">
          {SLOT_SIZE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'h-9 rounded-lg border text-xs font-bold transition-colors',
                value === option.value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'bg-background/50 text-muted-foreground border-border/60 hover:text-foreground hover:bg-background'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TimeSelect({
  label,
  value,
  min = 0,
  max = DAY_MINUTES,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[10px] font-bold text-muted-foreground uppercase">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full h-8 rounded-md border border-border/60 bg-background/70 px-2 text-xs font-semibold"
      >
        {TIME_OPTIONS.filter(minute => minute >= min && minute <= max).map(minute => (
          <option key={minute} value={minute}>
            {timeLabel(minute)}
          </option>
        ))}
      </select>
    </label>
  );
}

function Heatmap({
  slots,
  matrix,
  maxCellCount,
  workingHours,
}: {
  slots: TimeSlot[];
  matrix: Record<number, Record<number, { count: number; revenue: number }>>;
  maxCellCount: number;
  workingHours: WorkingHour[];
}) {
  if (slots.length === 0) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/20 p-8 text-center text-sm text-muted-foreground">
        Gösterilecek açık zaman aralığı bulunamadı.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/50 bg-card/20">
      <div className="p-3" style={{ minWidth: `${Math.max(620, 58 + slots.length * 58)}px` }}>
        <div className="grid gap-1" style={{ gridTemplateColumns: `52px repeat(${slots.length}, minmax(50px, 1fr))` }}>
          <div />
          {slots.map(slot => (
            <div key={slot.start} className="h-8 flex items-center justify-center text-[10px] font-bold text-muted-foreground text-center leading-tight">
              {slotHeaderLabel(slot)}
            </div>
          ))}
          {DAY_NAMES.map((day, dayIndex) => (
            <React.Fragment key={day}>
              <div className="h-9 flex items-center text-[10px] font-bold text-muted-foreground pr-2">
                {SHORT_DAY_NAMES[dayIndex]}
              </div>
              {slots.map(slot => {
                const stat = matrix[dayIndex][slot.start] ?? { count: 0, revenue: 0 };
                const isOpen = isSlotOpen(workingHours[dayIndex], slot);
                const intensity = maxCellCount > 0 ? stat.count / maxCellCount : 0;
                return (
                  <div
                    key={`${dayIndex}-${slot.start}`}
                    title={`${day} ${slot.label}: ${stat.count} sipariş, ${formatCurrency(stat.revenue)}${isOpen ? '' : ' · Kapalı aralık'}`}
                    className={cn(
                      'h-9 rounded-md border flex items-center justify-center text-[10px] font-bold transition-colors',
                      isOpen && stat.count > 0 && 'border-primary/20 text-primary-foreground',
                      isOpen && stat.count === 0 && 'border-border/30 bg-muted/15 text-muted-foreground/30',
                      !isOpen && 'border-border/20 bg-muted/35 text-muted-foreground/35'
                    )}
                    style={{
                      backgroundColor: isOpen && stat.count > 0
                        ? `hsl(var(--primary) / ${Math.max(0.18, intensity)})`
                        : undefined,
                    }}
                  >
                    {stat.count || (!isOpen ? '×' : '')}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone = 'normal',
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'normal' | 'hot' | 'good';
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-background/35 px-3 py-2 min-w-[120px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
        <Icon className={cn(
          'h-3.5 w-3.5',
          tone === 'hot' ? 'text-red-400' : tone === 'good' ? 'text-emerald-400' : 'text-primary'
        )} />
      </div>
      <p className="text-sm font-black mt-1">{value}</p>
    </div>
  );
}

function InsightPanel({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="font-bold text-sm">{title}</h4>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2 text-xs leading-relaxed">
            <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <span className="text-muted-foreground">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsTable({
  title,
  columns,
  rows,
  emptyText = 'Veri bulunamadı.',
  highlightFirst = false,
}: {
  title: string;
  columns: string[];
  rows: string[][];
  emptyText?: string;
  highlightFirst?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/25 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
        <h4 className="font-bold text-sm">{title}</h4>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]">
            <thead className="bg-muted/10 text-[10px] uppercase text-muted-foreground">
              <tr>
                {columns.map(column => (
                  <th key={column} className="px-4 py-2 text-left font-bold">{column}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={cn('hover:bg-muted/20', highlightFirst && rowIndex === 0 && 'bg-primary/5')}>
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${rowIndex}-${cellIndex}`}
                      className={cn(
                        'px-4 py-3 whitespace-nowrap',
                        cellIndex === 0 ? 'font-bold text-foreground' : 'text-muted-foreground',
                        highlightFirst && rowIndex === 0 && cellIndex === 0 && 'text-primary'
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function buildPeakHoursModel(
  filteredOrders: ParsedOrder[],
  analyses: OrderAnalysis[],
  workingHours: WorkingHour[],
  slotSize: SlotSize
) {
  const slots = createSlots(slotSize);
  const visibleSlots = slots.filter(slot => workingHours.some(row => isSlotOpen(row, slot)));
  const matrix = createEmptyMatrix(slots);
  const uniqueDates = new Set<string>();

  const activeRows: ActiveOrderRow[] = filteredOrders
    .map((order, index) => {
      const date = new Date(order.orderDate);
      const dayIndex = (date.getDay() + 6) % 7;
      const minuteOfDay = date.getHours() * 60 + date.getMinutes();
      const slotStart = Math.floor(minuteOfDay / slotSize) * slotSize;
      const analysis = analyses[index];

      return {
        order,
        analysis,
        dayIndex,
        minuteOfDay,
        slotStart,
        revenue: analysis?.netRevenue ?? order.totalAmount,
        isWithinWorkingHours: isMinuteOpen(workingHours[dayIndex], minuteOfDay),
      };
    })
    .filter(row => !isCancelled(row.order.status) && !isNaN(new Date(row.order.orderDate).getTime()));

  const inHoursRows = activeRows.filter(row => row.isWithinWorkingHours);
  const outOfHoursOrders = activeRows.filter(row => !row.isWithinWorkingHours);

  activeRows.forEach(row => {
    uniqueDates.add(new Date(row.order.orderDate).toLocaleDateString('sv-SE'));
  });

  inHoursRows.forEach(row => {
    matrix[row.dayIndex][row.slotStart].count += 1;
    matrix[row.dayIndex][row.slotStart].revenue += row.revenue;
  });

  const slotStats: SlotStat[] = visibleSlots.map(slot => {
    const openDays = workingHours.filter(row => isSlotOpen(row, slot)).length;
    const count = DAY_NAMES.reduce((sum, _, dayIndex) => (
      isSlotOpen(workingHours[dayIndex], slot) ? sum + matrix[dayIndex][slot.start].count : sum
    ), 0);
    const revenue = DAY_NAMES.reduce((sum, _, dayIndex) => (
      isSlotOpen(workingHours[dayIndex], slot) ? sum + matrix[dayIndex][slot.start].revenue : sum
    ), 0);
    const coveredDays = DAY_NAMES.filter((_, dayIndex) => (
      isSlotOpen(workingHours[dayIndex], slot) && matrix[dayIndex][slot.start].count > 0
    )).length;

    return {
      slot,
      count,
      revenue,
      avgBasket: count > 0 ? revenue / count : 0,
      dayCoverage: openDays > 0 ? (coveredDays / openDays) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  const dayStats: DayStat[] = DAY_NAMES.map((_, dayIndex) => {
    const count = visibleSlots.reduce((sum, slot) => (
      isSlotOpen(workingHours[dayIndex], slot) ? sum + matrix[dayIndex][slot.start].count : sum
    ), 0);
    const revenue = visibleSlots.reduce((sum, slot) => (
      isSlotOpen(workingHours[dayIndex], slot) ? sum + matrix[dayIndex][slot.start].revenue : sum
    ), 0);
    const peak = visibleSlots
      .map(slot => ({ slot, count: isSlotOpen(workingHours[dayIndex], slot) ? matrix[dayIndex][slot.start].count : 0 }))
      .sort((a, b) => b.count - a.count)[0];

    return {
      dayIndex,
      count,
      revenue,
      avgBasket: count > 0 ? revenue / count : 0,
      peakSlot: peak && peak.count > 0 ? peak.slot : null,
    };
  }).sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  const maxCellCount = visibleSlots.reduce((max, slot) => {
    const slotMax = DAY_NAMES.reduce((innerMax, _, dayIndex) => Math.max(innerMax, matrix[dayIndex][slot.start].count), 0);
    return Math.max(max, slotMax);
  }, 0);

  const totalRevenue = inHoursRows.reduce((sum, row) => sum + row.revenue, 0);
  const busiestSlot = slotStats.find(stat => stat.count > 0) ?? null;
  const quietWorkingSlots = slotStats.filter(stat => stat.count === 0);

  const workingWindows = DAY_NAMES.map((_, dayIndex) => {
    const workingHour = workingHours[dayIndex];
    const activeSlots = visibleSlots
      .map(slot => ({ slot, count: isSlotOpen(workingHour, slot) ? matrix[dayIndex][slot.start].count : 0 }))
      .filter(stat => stat.count > 0);

    if (!workingHour.isOpen) {
      return { dayIndex, count: 0, label: 'Kapalı', edgeNote: '' };
    }

    if (activeSlots.length === 0) {
      return {
        dayIndex,
        count: 0,
        label: `${timeLabel(workingHour.start)} - ${timeLabel(workingHour.end)} · veri yok`,
        edgeNote: 'Açık saat boyunca sipariş yok',
      };
    }

    const first = activeSlots[0].slot.start;
    const last = activeSlots[activeSlots.length - 1].slot.end;
    const openingGap = Math.max(0, first - workingHour.start);
    const closingGap = Math.max(0, workingHour.end - last);
    const parts: string[] = [];

    if (openingGap >= 60) parts.push(`açılış +${formatDuration(openingGap)}`);
    if (closingGap >= 60) parts.push(`kapanış -${formatDuration(closingGap)}`);

    return {
      dayIndex,
      count: activeSlots.reduce((sum, stat) => sum + stat.count, 0),
      label: `${timeLabel(first)} - ${timeLabel(last)}`,
      edgeNote: parts.length > 0 ? `Kenar notu: ${parts.join(' · ')}` : '',
    };
  });

  const recommendations = buildRecommendations({
    busiestSlot,
    dayStats,
    quietWorkingSlots,
    workingWindows,
    activeCount: inHoursRows.length,
    outOfHoursCount: outOfHoursOrders.length,
  });

  return {
    activeRows,
    visibleSlots,
    matrix,
    maxCellCount,
    slotStats,
    dayStats,
    busiestSlot,
    quietWorkingSlots,
    workingWindows,
    recommendations,
    uniqueDateCount: uniqueDates.size,
    averageBasket: inHoursRows.length > 0 ? totalRevenue / inHoursRows.length : 0,
    outOfHoursOrders,
  };
}

function buildRecommendations({
  busiestSlot,
  dayStats,
  quietWorkingSlots,
  workingWindows,
  activeCount,
  outOfHoursCount,
}: {
  busiestSlot: SlotStat | null;
  dayStats: DayStat[];
  quietWorkingSlots: SlotStat[];
  workingWindows: { dayIndex: number; count: number; label: string; edgeNote: string }[];
  activeCount: number;
  outOfHoursCount: number;
}) {
  const items: string[] = [];
  const topDay = dayStats.find(day => day.count > 0);
  const weakestDay = [...dayStats].reverse().find(day => day.count > 0);

  if (busiestSlot && activeCount > 0) {
    const pct = (busiestSlot.count / activeCount) * 100;
    items.push(`${busiestSlot.slot.label} aralığında ${busiestSlot.count} sipariş var; açık zamandaki aktif siparişin yaklaşık %${pct.toFixed(0)} kadarı bu aralığa denk geliyor.`);
  }

  if (topDay) {
    items.push(`${DAY_NAMES[topDay.dayIndex]} en güçlü gün; zirve aralık ${topDay.peakSlot?.label ?? '-'}.`);
  }

  if (weakestDay && topDay && weakestDay.dayIndex !== topDay.dayIndex) {
    items.push(`${DAY_NAMES[weakestDay.dayIndex]} daha sakin görünüyor; personel ve hazırlık planı bu gün için hafifletilebilir.`);
  }

  const noOrderOpenDays = workingWindows.filter(row => row.count === 0 && row.label !== 'Kapalı').map(row => DAY_NAMES[row.dayIndex]);
  if (noOrderOpenDays.length > 0) {
    items.push(`${noOrderOpenDays.join(', ')} açık olmasına rağmen sipariş almamış; bu günlerde saat daraltma ihtimali izlenebilir.`);
  }

  if (quietWorkingSlots.length > 0) {
    const actionableEdges = workingWindows.filter(row => row.edgeNote);
    if (actionableEdges.length > 0) {
      items.push(`${actionableEdges.length} günde açılış veya kapanış kenarında daraltılabilir boşluk var; gün ortası boşluklar kapanış önerisi olarak değerlendirilmez.`);
    }
  }

  if (outOfHoursCount > 0) {
    items.push(`${outOfHoursCount} sipariş çalışma saati dışında kalıyor; saat tanımı doğruysa bunları istisna olarak değerlendirin.`);
  }

  return items.slice(0, 5);
}

function createSlots(slotSize: SlotSize): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let start = 0; start < DAY_MINUTES; start += slotSize) {
    const end = Math.min(DAY_MINUTES, start + slotSize);
    slots.push({ start, end, label: `${timeLabel(start)} - ${timeLabel(end)}` });
  }
  return slots;
}

function createEmptyMatrix(slots: TimeSlot[]) {
  const matrix: Record<number, Record<number, { count: number; revenue: number }>> = {};
  DAY_NAMES.forEach((_, dayIndex) => {
    matrix[dayIndex] = {};
    slots.forEach(slot => {
      matrix[dayIndex][slot.start] = { count: 0, revenue: 0 };
    });
  });
  return matrix;
}

function normalizeWorkingHour(value: any, fallback: WorkingHour): WorkingHour {
  const rawStart = typeof value?.start === 'number'
    ? (value.start <= 24 ? value.start * 60 : value.start)
    : fallback.start;
  const start = clampToHalfHour(rawStart, 0, DAY_MINUTES - 30, fallback.start);

  const rawEnd = typeof value?.end === 'number'
    ? (value.end <= 24 ? value.end * 60 : value.end)
    : fallback.end;
  const end = clampToHalfHour(rawEnd, start + 30, DAY_MINUTES, fallback.end);

  return {
    isOpen: typeof value?.isOpen === 'boolean' ? value.isOpen : fallback.isOpen,
    start,
    end,
  };
}

function clampToHalfHour(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  const rounded = Math.round(value / 30) * 30;
  return Math.min(max, Math.max(min, rounded));
}

function isMinuteOpen(workingHour: WorkingHour, minute: number) {
  return workingHour.isOpen && minute >= workingHour.start && minute < workingHour.end;
}

function isSlotOpen(workingHour: WorkingHour, slot: TimeSlot) {
  return workingHour.isOpen && slot.end > workingHour.start && slot.start < workingHour.end;
}

function isSlotSize(value: number): value is SlotSize {
  return value === 30 || value === 60 || value === 120;
}

function isCancelled(status?: string) {
  if (!status) return false;
  const lower = status.toLocaleLowerCase('tr-TR');
  return lower.includes('iptal') || lower.includes('cancel') || lower.includes('reddedildi');
}

function timeLabel(minutes: number) {
  if (minutes === DAY_MINUTES) return '24:00';
  const normalized = ((minutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours > 0 && remainder > 0) return `${hours}s ${remainder}dk`;
  if (hours > 0) return `${hours}s`;
  return `${remainder}dk`;
}

function slotHeaderLabel(slot: TimeSlot) {
  return slot.end - slot.start <= 60
    ? timeLabel(slot.start)
    : `${timeLabel(slot.start)}\n${timeLabel(slot.end)}`;
}
