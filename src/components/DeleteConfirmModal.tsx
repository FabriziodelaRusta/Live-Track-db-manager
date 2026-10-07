import React, { useState } from 'react';
import { AlertTriangle, Trash2, Download, X, Loader2, Calendar, FileText } from 'lucide-react';
import { DaySummary } from '../types/tracking';
import { formatHumanDate } from '../utils/dateUtils';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'single-date' | 'month' | null;
  targetDateStr?: string;
  targetDateSummary?: DaySummary;
  targetMonthName?: string;
  targetMonthDateKeys?: string[];
  targetMonthTotalEntries?: number;
  onConfirmDelete: () => Promise<void>;
  onDownloadBackup: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  mode,
  targetDateStr,
  targetDateSummary,
  targetMonthName,
  targetMonthDateKeys = [],
  targetMonthTotalEntries = 0,
  onConfirmDelete,
  onDownloadBackup,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadedBackup, setDownloadedBackup] = useState(false);

  if (!isOpen || !mode) return null;

  const handleDownloadBackup = () => {
    onDownloadBackup();
    setDownloadedBackup(true);
  };

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirmDelete();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const isSingle = mode === 'single-date';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 bg-rose-50/80 border-b border-rose-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-rose-950">
                {isSingle ? 'Delete Date Entries' : 'Delete Entire Month Entries'}
              </h3>
              <p className="text-xs text-rose-700">
                Permanent deletion in Firebase DB: <code className="font-mono font-bold">Live_track</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {isSingle ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                You are about to remove all entries for:
              </p>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-900">
                    {targetDateStr ? formatHumanDate(targetDateStr) : ''}
                  </span>
                  <code className="text-xs font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-semibold">
                    {targetDateStr}
                  </code>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                  <span>
                    Trackers:{' '}
                    <strong>
                      {targetDateSummary?.trackerNames.join(', ') || 'N/A'}
                    </strong>
                  </span>
                  <span>
                    Total entries/points:{' '}
                    <strong>{targetDateSummary?.totalPointsCount ?? 'N/A'}</strong>
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-700">
                You are about to remove all tracking entries for the entire month of:
              </p>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    {targetMonthName}
                  </span>
                  <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                    {targetMonthDateKeys.length} dates to be deleted
                  </span>
                </div>

                <div className="text-xs text-slate-600">
                  Total tracking points across month: <strong>{targetMonthTotalEntries}</strong>
                </div>

                {/* List of date keys */}
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Dates included in this deletion:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {targetMonthDateKeys.map((dk) => (
                      <span
                        key={dk}
                        className="text-[11px] font-mono bg-white border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded"
                      >
                        {dk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup prompt */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                {downloadedBackup
                  ? 'Backup downloaded! Safe to proceed.'
                  : 'Recommended: Download a JSON backup before deleting.'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="px-2.5 py-1 text-xs font-semibold bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-800 rounded-lg transition-colors inline-flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadedBackup ? 'Downloaded' : 'Backup JSON'}</span>
            </button>
          </div>

          <p className="text-xs text-rose-600 font-medium">
            Warning: This action cannot be undone. Nodes will be removed from Firebase RTDB immediately.
          </p>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-sm transition-all disabled:opacity-60 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting from Live_track...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>
                  {isSingle
                    ? `Delete ${targetDateStr}`
                    : `Delete All ${targetMonthDateKeys.length} Dates`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
