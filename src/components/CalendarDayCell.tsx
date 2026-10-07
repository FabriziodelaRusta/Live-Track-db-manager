import React from 'react';
import { Trash2, User, MapPin, Loader2, Info } from 'lucide-react';
import { CalendarGridDay } from '../utils/dateUtils';
import { DaySummary } from '../types/tracking';

interface CalendarDayCellProps {
  day: CalendarGridDay;
  summary?: DaySummary;
  displayMode: 'points' | 'trackers' | 'both';
  onSelectDay: (dateStr: string) => void;
  onRequestDeleteDate: (dateStr: string, summary?: DaySummary) => void;
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  day,
  summary,
  displayMode,
  onSelectDay,
  onRequestDeleteDate,
}) => {
  const hasData = summary?.hasData;
  const isLoading = summary?.isLoading;
  const trackersCount = summary?.trackersCount || 0;
  const totalPoints = summary?.totalPointsCount || 0;
  const validPoints = summary?.validPointsCount || 0;
  const trackerNames = summary?.trackerNames || [];

  return (
    <div
      onClick={() => onSelectDay(day.dateStr)}
      className={`group relative flex flex-col justify-between p-2.5 sm:p-3 min-h-[105px] sm:min-h-[125px] border transition-all cursor-pointer rounded-lg ${
        day.isCurrentMonth ? 'bg-white' : 'bg-slate-50/70 opacity-70'
      } ${
        day.isToday
          ? 'ring-2 ring-indigo-500 ring-offset-1 border-indigo-300'
          : 'border-slate-200 hover:border-indigo-300'
      } ${
        hasData
          ? 'hover:shadow-md bg-gradient-to-b from-white to-sky-50/30'
          : 'hover:bg-slate-50/90'
      }`}
    >
      {/* Header: Day number + Today Tag */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold transition-colors ${
            day.isToday
              ? 'bg-indigo-600 text-white font-bold'
              : day.isCurrentMonth
              ? 'text-slate-700 group-hover:text-indigo-600'
              : 'text-slate-400'
          }`}
        >
          {day.dayOfMonth}
        </span>

        {day.isToday && (
          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
            Today
          </span>
        )}
      </div>

      {/* Middle/Content Area: Data indicators or empty */}
      <div className="my-1.5 flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400 py-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
            <span className="text-[11px]">Loading...</span>
          </div>
        ) : hasData ? (
          <div className="space-y-1.5">
            {/* The primary entry count badge with the REMOVE ICON right close to it as requested */}
            <div className="flex items-center justify-between gap-1 p-1.5 rounded-md bg-indigo-50/80 border border-indigo-100/90 group-hover:border-indigo-200">
              <div className="flex items-center gap-1 min-w-0">
                <span className="flex items-center gap-1 font-semibold text-xs text-indigo-950">
                  <span className="text-indigo-600 font-bold">{totalPoints}</span>
                  <span className="text-[11px] text-indigo-700 font-medium truncate">
                    {totalPoints === 1 ? 'entry' : 'entries'}
                  </span>
                </span>
              </div>

              {/* CLOSE TO THE NUMBER: REMOVE ICON BUTTON */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDeleteDate(day.dateStr, summary);
                }}
                title={`Remove all ${totalPoints} entries for ${day.dateStr}`}
                aria-label={`Remove entries for ${day.dateStr}`}
                className="shrink-0 p-1 rounded hover:bg-rose-100 text-rose-500 hover:text-rose-700 transition-colors cursor-pointer group/del"
              >
                <Trash2 className="w-3.5 h-3.5 transition-transform group-hover/del:scale-110" />
              </button>
            </div>

            {/* Tracker name & GPS info sub-badge */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-0.5 text-slate-600 truncate max-w-full">
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate font-medium text-slate-700">
                  {trackerNames.join(', ') || '1 tracker'}
                </span>
              </span>
              {trackersCount > 1 && (
                <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-100/70 px-1 rounded">
                  +{trackersCount}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="h-6 flex items-center">
            <span className="text-[11px] text-slate-300 group-hover:text-slate-400 transition-colors">
              No entries
            </span>
          </div>
        )}
      </div>

      {/* Footer subtle details */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
        <span className="font-mono text-[9px] text-slate-400">
          {day.dateStr.slice(4, 6)}/{day.dateStr.slice(6, 8)}
        </span>
        {hasData && (
          <span className="opacity-0 group-hover:opacity-100 text-indigo-600 font-medium flex items-center gap-0.5 transition-opacity">
            <Info className="w-2.5 h-2.5" /> Details
          </span>
        )}
      </div>
    </div>
  );
};
