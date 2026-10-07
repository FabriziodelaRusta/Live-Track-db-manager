import React from 'react';
import { CalendarGridDay } from '../utils/dateUtils';
import { DaySummary } from '../types/tracking';
import { CalendarDayCell } from './CalendarDayCell';

interface CalendarGridProps {
  days: CalendarGridDay[];
  summaries: Record<string, DaySummary>;
  displayMode: 'points' | 'trackers' | 'both';
  onSelectDay: (dateStr: string) => void;
  onRequestDeleteDate: (dateStr: string, summary?: DaySummary) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  days,
  summaries,
  displayMode,
  onSelectDay,
  onRequestDeleteDate,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 sm:p-5 overflow-hidden">
      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
        {WEEKDAYS.map((dayName, idx) => (
          <div
            key={dayName}
            className={`py-2 text-xs font-bold uppercase tracking-wider rounded-lg ${
              idx >= 5 ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-500 bg-slate-50'
            }`}
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => {
          const summary = summaries[day.dateStr];
          return (
            <CalendarDayCell
              key={day.dateStr}
              day={day}
              summary={summary}
              displayMode={displayMode}
              onSelectDay={onSelectDay}
              onRequestDeleteDate={onRequestDeleteDate}
            />
          );
        })}
      </div>
    </div>
  );
};
