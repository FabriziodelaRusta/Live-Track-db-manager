export interface CalendarGridDay {
  date: Date;
  dateStr: string; // "YYYYMMDD"
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function padZero(num: number, length = 2): string {
  return num.toString().padStart(length, '0');
}

export function formatToDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}${m}${d}`;
}

export function parseDateStr(str: string): Date | null {
  if (!str || str.length !== 8) return null;
  const y = parseInt(str.substring(0, 4), 10);
  const m = parseInt(str.substring(4, 6), 10) - 1;
  const d = parseInt(str.substring(6, 8), 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return new Date(y, m, d);
}

export function formatHumanDate(dateStr: string): string {
  const parsed = parseDateStr(dateStr);
  if (!parsed) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatMonthYear(year: number, monthZeroIndexed: number): string {
  const date = new Date(year, monthZeroIndexed, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getMonthYearKey(year: number, monthZeroIndexed: number): string {
  return `${year}${padZero(monthZeroIndexed + 1)}`;
}

export function getCalendarGridDays(year: number, monthZeroIndexed: number, startOnMonday = true): CalendarGridDay[] {
  const firstDayOfMonth = new Date(year, monthZeroIndexed, 1);
  const lastDayOfMonth = new Date(year, monthZeroIndexed + 1, 0);

  const todayStr = formatToDateStr(new Date());

  // Determine starting offset
  // JS getDay(): 0 is Sunday, 1 is Monday ... 6 is Saturday
  let firstDayIndex = firstDayOfMonth.getDay();
  if (startOnMonday) {
    // 0 (Sun) becomes 6, 1 (Mon) becomes 0
    firstDayIndex = (firstDayIndex + 6) % 7;
  }

  const days: CalendarGridDay[] = [];

  // Previous month trailing days
  const prevMonthLastDate = new Date(year, monthZeroIndexed, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDate - i;
    const date = new Date(year, monthZeroIndexed - 1, dayNum);
    const dateStr = formatToDateStr(date);
    days.push({
      date,
      dateStr,
      dayOfMonth: dayNum,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  const totalDaysInMonth = lastDayOfMonth.getDate();
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const date = new Date(year, monthZeroIndexed, d);
    const dateStr = formatToDateStr(date);
    days.push({
      date,
      dateStr,
      dayOfMonth: d,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });
  }

  // Next month leading days to complete full weeks (up to multiple of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const date = new Date(year, monthZeroIndexed + 1, d);
    const dateStr = formatToDateStr(date);
    days.push({
      date,
      dateStr,
      dayOfMonth: d,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  return days;
}
