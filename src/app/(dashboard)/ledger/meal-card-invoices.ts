export type MealCardPlatform =
  | 'multinet'
  | 'edenred'
  | 'pluxee'
  | 'setcard'
  | 'metropol'
  | 'tokenflex';

export type MealCardInvoice = {
  platform: MealCardPlatform;
  date: string;
  completed: boolean;
};

export const MEAL_CARD_PLATFORM_NAMES: Record<MealCardPlatform, string> = {
  multinet: 'Multinet',
  edenred: 'Edenred',
  pluxee: 'Pluxee',
  setcard: 'Setcard',
  metropol: 'Metropol Kart',
  tokenflex: 'Tokenflex',
};

const toDateKey = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

const distributeDays = (firstDay: number, lastDay: number, count: number) => {
  if (count <= 1) return [lastDay];

  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return firstDay;
    if (index === count - 1) return lastDay;
    return Math.round(firstDay + (index * (lastDay - firstDay)) / (count - 1));
  });
};

export function createMealCardInvoiceSchedule(
  year: number,
  month: number,
  completedInvoices: MealCardInvoice[] = []
): MealCardInvoice[] {
  const lastDay = new Date(year, month, 0).getDate();
  const completionMap = new Map(
    completedInvoices.map(invoice => [`${invoice.platform}:${invoice.date}`, invoice.completed])
  );
  const schedule: Omit<MealCardInvoice, 'completed'>[] = [];

  for (let day = 1; day <= lastDay; day++) {
    if (new Date(year, month - 1, day).getDay() === 2) {
      schedule.push({ platform: 'multinet', date: toDateKey(year, month, day) });
    }
  }

  for (const platform of ['edenred', 'pluxee'] as const) {
    for (const day of distributeDays(7, lastDay, 5)) {
      schedule.push({ platform, date: toDateKey(year, month, day) });
    }
  }

  for (const day of distributeDays(11, lastDay, 4)) {
    schedule.push({ platform: 'setcard', date: toDateKey(year, month, day) });
  }

  for (const platform of ['metropol', 'tokenflex'] as const) {
    schedule.push({ platform, date: toDateKey(year, month, lastDay) });
  }

  return schedule
    .map(invoice => ({
      ...invoice,
      completed: completionMap.get(`${invoice.platform}:${invoice.date}`) ?? false,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.platform.localeCompare(b.platform));
}
