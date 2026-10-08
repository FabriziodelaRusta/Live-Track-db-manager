/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { rtdbService, getStoredConfig } from './services/firebaseRtdb';
import {
  CalendarGridDay,
  formatMonthYear,
  formatToDateStr,
  getCalendarGridDays,
  getMonthYearKey,
  parseDateStr,
} from './utils/dateUtils';
import { DayData, DaySummary, RtdbConfig, ToastMessage } from './types/tracking';
import { CalendarHeader } from './components/CalendarHeader';
import { CalendarGrid } from './components/CalendarGrid';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DateDetailsModal } from './components/DateDetailsModal';
import { SettingsModal } from './components/SettingsModal';
import { ToastContainer } from './components/Toast';
import { Database, AlertTriangle, RefreshCw, Calendar as CalendarIcon, Info } from 'lucide-react';

export default function App() {
// Navigation state — open on the current month
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth());
  // DB Config & status
  const [config, setConfig] = useState<RtdbConfig>(getStoredConfig());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // All known date keys in the RTDB tracking/ node (e.g. ['20260630', '20260701', ...])
  const [allDateKeys, setAllDateKeys] = useState<string[]>([]);

  // Detailed summaries map: key = 'YYYYMMDD' => DaySummary
  const [daySummaries, setDaySummaries] = useState<Record<string, DaySummary>>({});

  // Track which date keys have already been fetched or are currently in-flight
  const fetchedOrLoadingKeysRef = useRef<Set<string>>(new Set());

  // Trackers count / display mode
  const [displayMode] = useState<'points' | 'trackers' | 'both'>('points');

  // Sizing mode: 80% size requested by user
  const [is80PercentSize, setIs80PercentSize] = useState<boolean>(true);

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [detailsDateStr, setDetailsDateStr] = useState<string | null>(null);

  // Delete Confirmation Modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single-date' | 'month' | null>(null);
  const [targetDateStr, setTargetDateStr] = useState<string | undefined>(undefined);
  const [targetDateSummary, setTargetDateSummary] = useState<DaySummary | undefined>(undefined);

  // Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Compute days for calendar grid
  const gridDays = useMemo(() => {
    return getCalendarGridDays(currentYear, currentMonth, true);
  }, [currentYear, currentMonth]);

  // Current month prefix string, e.g. "202607"
  const currentMonthPrefix = useMemo(() => {
    return getMonthYearKey(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  // Dates strictly belonging to the currently selected month that exist in DB
  const monthDateKeysInDb = useMemo(() => {
    return allDateKeys.filter((dk) => dk.startsWith(currentMonthPrefix));
  }, [allDateKeys, currentMonthPrefix]);

  // Total entries count for the current month
  const monthTotalEntries = useMemo(() => {
    return monthDateKeysInDb.reduce((acc, dk) => {
      const summary = daySummaries[dk];
      return acc + (summary?.totalPointsCount || 0);
    }, 0);
  }, [monthDateKeysInDb, daySummaries]);

  // Months available in DB for the Quick Jump bar
  const availableMonthKeys = useMemo(() => {
    const monthMap: Record<string, number> = {};
    for (const dk of allDateKeys) {
      if (dk.length >= 6) {
        const mKey = dk.substring(0, 6);
        monthMap[mKey] = (monthMap[mKey] || 0) + 1;
      }
    }

    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mKey, count]) => {
        const y = parseInt(mKey.substring(0, 4), 10);
        const m = parseInt(mKey.substring(4, 6), 10) - 1;
        const monthDate = new Date(y, m, 1);
        const label = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return { key: mKey, label, count };
      });
  }, [allDateKeys]);

  /**
   * Fetch all shallow date keys from tracking.json
   */
  const loadDateKeys = useCallback(async () => {
    setIsRefreshing(true);
    setDbError(null);
    try {
      const keys = await rtdbService.fetchAllDateKeys();
      setAllDateKeys(keys);
      // Reset fetched set on manual refresh
      fetchedOrLoadingKeysRef.current.clear();
      return keys;
    } catch (err: any) {
      console.error('Failed to load RTDB date keys:', err);
      setDbError(err?.message || 'Failed to connect to Firebase Realtime Database');
      addToast('error', 'Database Connection Error', err?.message);
      return [];
    } finally {
      setIsRefreshing(false);
    }
  }, [addToast]);

  /**
   * Fetch details for dates visible in the calendar grid
   */
  const loadVisibleGridDetails = useCallback(
    async (keysToFetch: string[]) => {
      // Only fetch keys that haven't already been requested or fetched
      const needed = keysToFetch.filter(
        (dk) => !fetchedOrLoadingKeysRef.current.has(dk)
      );
      if (needed.length === 0) return;

      // Mark immediately in ref to guarantee no duplicate network requests or loops
      for (const k of needed) {
        fetchedOrLoadingKeysRef.current.add(k);
      }

      // Mark as loading in React state
      setDaySummaries((prev) => {
        const next = { ...prev };
        for (const k of needed) {
          next[k] = {
            ...(next[k] || {
              dateStr: k,
              hasData: true,
              trackerNames: [],
              trackersCount: 0,
              totalPointsCount: 0,
              validPointsCount: 0,
            }),
            isLoading: true,
          };
        }
        return next;
      });

      // Parallel batch fetch
      await Promise.all(
        needed.map(async (dk) => {
          try {
            const data = await rtdbService.fetchDateData(dk);
            const summary = rtdbService.parseDaySummary(dk, data);
            setDaySummaries((prev) => ({
              ...prev,
              [dk]: { ...summary, isLoading: false },
            }));
          } catch (err: any) {
            console.error(`Error fetching date ${dk}:`, err);
            setDaySummaries((prev) => ({
              ...prev,
              [dk]: {
                dateStr: dk,
                hasData: false,
                isLoading: false,
                error: err?.message,
                trackerNames: [],
                trackersCount: 0,
                totalPointsCount: 0,
                validPointsCount: 0,
              },
            }));
          }
        })
      );
    },
    []
  );

  // Initial load
  useEffect(() => {
    loadDateKeys();
  }, [loadDateKeys]);

  // When allDateKeys or gridDays changes, trigger detail fetches for active grid days that exist in DB
  useEffect(() => {
    const datesInGridWithData = gridDays
      .map((d) => d.dateStr)
      .filter((dk) => allDateKeys.includes(dk));

    if (datesInGridWithData.length > 0) {
      loadVisibleGridDetails(datesInGridWithData);
    }
  }, [gridDays, allDateKeys, loadVisibleGridDetails]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  const handleSelectYearMonth = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  // Open single date delete confirmation
  const handleRequestDeleteDate = (dateStr: string, summary?: DaySummary) => {
    setDeleteMode('single-date');
    setTargetDateStr(dateStr);
    setTargetDateSummary(summary || daySummaries[dateStr]);
    setDeleteModalOpen(true);
  };

  // Open global month delete confirmation
  const handleRequestDeleteMonth = () => {
    if (monthDateKeysInDb.length === 0) return;
    setDeleteMode('month');
    setDeleteModalOpen(true);
  };

  // Execute deletion
  const handleConfirmDelete = async () => {
    if (deleteMode === 'single-date' && targetDateStr) {
      try {
        await rtdbService.deleteDate(targetDateStr);
        fetchedOrLoadingKeysRef.current.delete(targetDateStr);
        setAllDateKeys((prev) => prev.filter((d) => d !== targetDateStr));
        setDaySummaries((prev) => {
          const next = { ...prev };
          delete next[targetDateStr];
          return next;
        });
        addToast(
          'success',
          'Date Removed',
          `Successfully removed entries for ${targetDateStr} from Live_track db.`
        );
      } catch (err: any) {
        addToast('error', 'Delete Failed', err?.message || 'Could not delete date.');
        throw err;
      }
    } else if (deleteMode === 'month') {
      try {
        const monthName = formatMonthYear(currentYear, currentMonth);
        const { deletedCount } = await rtdbService.deleteMonthDates(monthDateKeysInDb);
        const deletedSet = new Set(monthDateKeysInDb);

        for (const d of monthDateKeysInDb) {
          fetchedOrLoadingKeysRef.current.delete(d);
        }

        setAllDateKeys((prev) => prev.filter((d) => !deletedSet.has(d)));
        setDaySummaries((prev) => {
          const next = { ...prev };
          for (const d of monthDateKeysInDb) {
            delete next[d];
          }
          return next;
        });
        addToast(
          'success',
          'Month Entries Deleted',
          `Successfully deleted ${deletedCount} dates for ${monthName} from Live_track db.`
        );
      } catch (err: any) {
        addToast('error', 'Global Month Delete Failed', err?.message || 'Could not delete month.');
        throw err;
      }
    }
  };

  // Tracker deletion inside a specific date
  const handleDeleteTracker = async (dateStr: string, trackerName: string) => {
    try {
      await rtdbService.deleteTracker(dateStr, trackerName);
      // Re-fetch that day
      const updatedData = await rtdbService.fetchDateData(dateStr);
      if (!updatedData || Object.keys(updatedData).length === 0) {
        // Date is now completely empty, remove date
        fetchedOrLoadingKeysRef.current.delete(dateStr);
        setAllDateKeys((prev) => prev.filter((d) => d !== dateStr));
        setDaySummaries((prev) => {
          const next = { ...prev };
          delete next[dateStr];
          return next;
        });
        setDetailsDateStr(null);
      } else {
        const summary = rtdbService.parseDaySummary(dateStr, updatedData);
        setDaySummaries((prev) => ({
          ...prev,
          [dateStr]: summary,
        }));
      }
      addToast(
        'success',
        'Tracker Removed',
        `Removed tracker "${trackerName}" from ${dateStr}.`
      );
    } catch (err: any) {
      addToast('error', 'Failed to remove tracker', err?.message);
    }
  };

  // Download backup helpers
  const handleDownloadSingleBackup = (dateStr: string) => {
    const summary = daySummaries[dateStr];
    const data = summary?.raw || { note: 'no detailed data' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live_track_${dateStr}_backup.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('info', 'Backup Downloaded', `Saved live_track_${dateStr}_backup.json`);
  };

  const handleDownloadMonthBackup = async () => {
    addToast('info', 'Preparing Month Backup', 'Fetching all dates for export...');
    try {
      const monthData: Record<string, any> = {};
      for (const dk of monthDateKeysInDb) {
        monthData[dk] = daySummaries[dk]?.raw || (await rtdbService.fetchDateData(dk));
      }
      const blob = new Blob([JSON.stringify(monthData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `live_track_${currentMonthPrefix}_month_backup.json`;
      a.click();
      URL.revokeObjectURL(url);
      addToast('success', 'Month Backup Ready', `Saved ${monthDateKeysInDb.length} dates.`);
    } catch (e: any) {
      addToast('error', 'Export Failed', e?.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 text-slate-900 py-6 sm:py-8 px-3 sm:px-6">
      {/* 
        CALENDAR CONTAINER (Size 80% of page by default as specified in user prompt:
        "The page should display a calendar (size 80 % of the page)")
      */}
      <div
        className={`transition-all duration-300 mx-auto ${
          is80PercentSize
            ? 'w-full md:w-[82%] lg:w-[80%] max-w-[1440px]'
            : 'w-full max-w-[96vw]'
        }`}
      >
        {/* Error notice if DB unreachable */}
        {dbError && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold">Firebase Live_track Connection Issue</h4>
              <p className="text-xs mt-0.5 opacity-90">{dbError}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => loadDateKeys()}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Retry Connection
                </button>
                <button
                  onClick={() => setSettingsOpen(true)}
                  className="px-3 py-1 bg-white border border-rose-300 text-rose-800 hover:bg-rose-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Check Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Header with navigation and global month delete */}
        <CalendarHeader
          currentYear={currentYear}
          currentMonth={currentMonth}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onToday={handleToday}
          onSelectYearMonth={handleSelectYearMonth}
          onRefresh={loadDateKeys}
          isRefreshing={isRefreshing}
          onRequestDeleteMonth={handleRequestDeleteMonth}
          monthDatesCount={monthDateKeysInDb.length}
          monthTotalEntriesCount={monthTotalEntries}
          availableMonthKeys={availableMonthKeys}
          onOpenSettings={() => setSettingsOpen(true)}
          onExportMonthBackup={handleDownloadMonthBackup}
          is80PercentSize={is80PercentSize}
          onToggleSize={() => setIs80PercentSize((prev) => !prev)}
        />

        {/* 7-Day Calendar Grid */}
        <CalendarGrid
          days={gridDays}
          summaries={daySummaries}
          displayMode={displayMode}
          onSelectDay={(dateStr) => setDetailsDateStr(dateStr)}
          onRequestDeleteDate={handleRequestDeleteDate}
        />

        {/* Footer info & tips */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 px-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Target DB:{' '}
              <a
                href={config.databaseUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-indigo-600 hover:underline"
              >
                live-track-799f8-default-rtdb
              </a>{' '}
              / tracking
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Click any day to view GPS coordinates & trackers</span>
            <span>Click trash icon to delete day</span>
          </div>
        </div>
      </div>

      {/* Date Details Modal (Inspection) */}
      <DateDetailsModal
        isOpen={Boolean(detailsDateStr)}
        onClose={() => setDetailsDateStr(null)}
        dateStr={detailsDateStr || ''}
        summary={detailsDateStr ? daySummaries[detailsDateStr] : undefined}
        rawDayData={detailsDateStr ? daySummaries[detailsDateStr]?.raw : undefined}
        onRequestDeleteDate={handleRequestDeleteDate}
        onDeleteTracker={handleDeleteTracker}
        onExportDayJson={handleDownloadSingleBackup}
      />

      {/* Delete Confirmation Modal (handles both single date and entire month) */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeleteMode(null);
        }}
        mode={deleteMode}
        targetDateStr={targetDateStr}
        targetDateSummary={targetDateSummary}
        targetMonthName={formatMonthYear(currentYear, currentMonth)}
        targetMonthDateKeys={monthDateKeysInDb}
        targetMonthTotalEntries={monthTotalEntries}
        onConfirmDelete={handleConfirmDelete}
        onDownloadBackup={() => {
          if (deleteMode === 'single-date' && targetDateStr) {
            handleDownloadSingleBackup(targetDateStr);
          } else if (deleteMode === 'month') {
            handleDownloadMonthBackup();
          }
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        config={config}
        onSaveConfig={(newConfig) => {
          rtdbService.setConfig(newConfig);
          setConfig(newConfig);
          loadDateKeys();
          addToast('success', 'Settings Saved', 'Firebase RTDB configuration updated.');
        }}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
