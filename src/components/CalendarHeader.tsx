import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Trash2,
  Download,
  Settings,
  Calendar as CalendarIcon,
  Database,
  Maximize2,
  Minimize2,
  Users,
  MapPin,
  FileCode,
} from 'lucide-react';
import { formatMonthYear } from '../utils/dateUtils';

interface CalendarHeaderProps {
  currentYear: number;
  currentMonth: number; // 0-indexed
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onSelectYearMonth: (year: number, month: number) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onRequestDeleteMonth: () => void;
  monthDatesCount: number;
  monthTotalEntriesCount: number;
  availableMonthKeys: { key: string; label: string; count: number }[];
  onOpenSettings: () => void;
  onExportMonthBackup: () => void;
  is80PercentSize: boolean;
  onToggleSize: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentYear,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onSelectYearMonth,
  onRefresh,
  isRefreshing,
  onRequestDeleteMonth,
  monthDatesCount,
  monthTotalEntriesCount,
  availableMonthKeys,
  onOpenSettings,
  onExportMonthBackup,
  is80PercentSize,
  onToggleSize,
}) => {
  const monthName = formatMonthYear(currentYear, currentMonth);

  const monthsList = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const currentYearOptions = [2024, 2025, 2026, 2027, 2028];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-5 mb-5 space-y-4">
      {/* Top row: Brand & Primary Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: App Title and Live DB Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-indigo-100 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Live_track Database
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                RTDB Connected
              </span>
            </div>
            <p className="text-xs text-slate-500">
              tracking / YYYYMMDD / [User] / current & history
            </p>
          </div>
        </div>

        {/* Right: Actions (Refresh, Backup, Settings, Sizing) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-60 cursor-pointer"
            title="Refresh database records"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Backup Month */}
          <button
            onClick={onExportMonthBackup}
            disabled={monthDatesCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Export this month data to JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>

          {/* Sizing toggle */}
          <button
            onClick={onToggleSize}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title={is80PercentSize ? 'Switch to Full Width' : 'Switch to 80% Page Width (Default)'}
          >
            {is80PercentSize ? (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Expand (100%)</span>
              </>
            ) : (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Standard (80%)</span>
              </>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Database Configuration"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Config</span>
          </button>
        </div>
      </div>

      {/* Middle row: Month Navigator & Global Delete Button */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={onPrevMonth}
              className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="Previous Month"
              aria-label="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={onNextMonth}
              className="p-1.5 rounded-md hover:bg-white text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
              title="Next Month"
              aria-label="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onToday}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
          >
            Today
          </button>

          {/* Month & Year Selectors */}
          <div className="flex items-center gap-1.5">
            <select
              value={currentMonth}
              onChange={(e) => onSelectYearMonth(currentYear, parseInt(e.target.value, 10))}
              className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {monthsList.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            <select
              value={currentYear}
              onChange={(e) => onSelectYearMonth(parseInt(e.target.value, 10), currentMonth)}
              className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {currentYearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right side of middle row: Global Delete Month Button */}
        <div className="flex items-center gap-3">
          {/* Quick stats for current month */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
              <strong className="text-slate-700">{monthDatesCount}</strong> active {monthDatesCount === 1 ? 'day' : 'days'}
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
              <strong className="text-slate-700">{monthTotalEntriesCount}</strong> total entries
            </span>
          </div>

          {/* THE GLOBAL DELETE FOR THE MONTH DISPLAY */}
          <button
            type="button"
            onClick={onRequestDeleteMonth}
            disabled={monthDatesCount === 0}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-sm ${
              monthDatesCount > 0
                ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-600 hover:text-white hover:border-rose-600 active:scale-95 cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
            title={
              monthDatesCount > 0
                ? `Remove all entries for ${monthName} in Firebase Live_track db`
                : `No entries in ${monthName} to delete`
            }
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Delete Month Entries</span>
            {monthDatesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[11px] font-bold bg-rose-200/80 text-rose-800">
                {monthDatesCount} {monthDatesCount === 1 ? 'date' : 'dates'}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom row: Quick Jump Chips to months with actual data in DB */}
      {availableMonthKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" /> Quick Jump:
          </span>
          {availableMonthKeys.map((item) => {
            const yearNum = parseInt(item.key.slice(0, 4), 10);
            const monthNum = parseInt(item.key.slice(4, 6), 10) - 1;
            const isSelected = yearNum === currentYear && monthNum === currentMonth;

            return (
              <button
                key={item.key}
                onClick={() => onSelectYearMonth(yearNum, monthNum)}
                className={`text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                    : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[10px] px-1 py-0.2 rounded-full ${
                    isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
