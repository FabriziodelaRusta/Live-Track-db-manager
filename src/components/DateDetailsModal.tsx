import React, { useState, useMemo } from 'react';
import {
  X,
  Trash2,
  Download,
  MapPin,
  ExternalLink,
  User,
  Clock,
  Code,
  AlertCircle,
  Copy,
  Check,
  Route,
  Map,
  Compass,
} from 'lucide-react';
import { DayData, DaySummary, TrackerUser, TrackingPoint } from '../types/tracking';
import { formatHumanDate } from '../utils/dateUtils';
import {
  getSortedValidTrackPoints,
  calculateTotalTrackDistance,
  buildGoogleMapsTrackUrl,
  buildOsmTrackUrl,
  generateGpxString,
} from '../utils/trackUtils';
import { TrackMapView } from './TrackMapView';

interface DateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  summary?: DaySummary;
  rawDayData?: DayData | null;
  onRequestDeleteDate: (dateStr: string, summary?: DaySummary) => void;
  onDeleteTracker: (dateStr: string, trackerName: string) => Promise<void>;
  onExportDayJson: (dateStr: string) => void;
}

export const DateDetailsModal: React.FC<DateDetailsModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  summary,
  rawDayData,
  onRequestDeleteDate,
  onDeleteTracker,
  onExportDayJson,
}) => {
  const [activeTab, setActiveTab] = useState<'trackers' | 'json'>('trackers');
  const [selectedTracker, setSelectedTracker] = useState<string>('');
  const [copiedJson, setCopiedJson] = useState(false);
  const [deletingTracker, setDeletingTracker] = useState<string | null>(null);

  const trackerNames = rawDayData
    ? Object.keys(rawDayData)
    : summary?.trackerNames || [];

  const currentTrackerName =
    selectedTracker && trackerNames.includes(selectedTracker)
      ? selectedTracker
      : trackerNames[0] || '';

  const currentTrackerData: TrackerUser | undefined =
    rawDayData && currentTrackerName ? rawDayData[currentTrackerName] : undefined;

  const currentLocation: TrackingPoint | undefined = currentTrackerData?.current;

  const historyPoints: TrackingPoint[] = useMemo(() => {
    if (Array.isArray(currentTrackerData?.history)) {
      return currentTrackerData!.history.filter(Boolean) as TrackingPoint[];
    }
    return [];
  }, [currentTrackerData]);

  // All chronological track points combining history and current position
  const allTrackPoints: TrackingPoint[] = useMemo(() => {
    return getSortedValidTrackPoints(historyPoints, currentLocation);
  }, [historyPoints, currentLocation]);

  // Total track distance in km
  const totalTrackDistanceKm = useMemo(() => {
    return calculateTotalTrackDistance(allTrackPoints);
  }, [allTrackPoints]);

  // URLs for displaying all points like a GPX track on Google Maps and OpenStreetMap
  const googleMapsTrackUrl = useMemo(() => {
    return buildGoogleMapsTrackUrl(allTrackPoints);
  }, [allTrackPoints]);

  const osmTrackUrl = useMemo(() => {
    return buildOsmTrackUrl(allTrackPoints, currentTrackerName, dateStr);
  }, [allTrackPoints, currentTrackerName, dateStr]);

  const handleCopyJson = () => {
    if (!rawDayData) return;
    navigator.clipboard.writeText(JSON.stringify(rawDayData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadGpx = () => {
    if (!allTrackPoints.length) return;
    const gpxXml = generateGpxString(allTrackPoints, currentTrackerName, dateStr);
    const blob = new Blob([gpxXml], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `live_track_${currentTrackerName}_${dateStr}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteTracker = async (tName: string) => {
    if (confirm(`Remove tracker "${tName}" from date ${dateStr}?`)) {
      setDeletingTracker(tName);
      try {
        await onDeleteTracker(dateStr, tName);
      } finally {
        setDeletingTracker(null);
      }
    }
  };

  // Safe early return after all hooks have executed unconditionally
  if (!isOpen || !dateStr) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <Route className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">
                  {formatHumanDate(dateStr)}
                </h3>
                <code className="text-xs font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">
                  {dateStr}
                </code>
              </div>
              <p className="text-xs text-slate-500">
                Live_track DB path:{' '}
                <span className="font-mono text-slate-700">tracking/{dateStr}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadGpx}
              disabled={allTrackPoints.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-300 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
              title="Download standard GPX track file for Garmin, Strava, or Google Earth"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export GPX</span>
            </button>
            <button
              onClick={() => onExportDayJson(dateStr)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 transition-colors cursor-pointer"
              title="Download Day JSON"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('trackers')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'trackers'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>GPX Track & Positions ({trackerNames.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'json'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw JSON</span>
            </button>
          </div>

          {/* Date Delete Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onRequestDeleteDate(dateStr, summary);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Date</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {trackerNames.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">No tracking data found for this date.</p>
              <p className="text-xs text-slate-400">
                This date is not present under <code className="font-mono">tracking/{dateStr}</code>.
              </p>
            </div>
          ) : activeTab === 'trackers' ? (
            <div className="space-y-4">
              {/* Tracker Selector Pills */}
              {trackerNames.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-semibold text-slate-500 shrink-0">
                    Select Tracker:
                  </span>
                  {trackerNames.map((name) => (
                    <button
                      key={name}
                      onClick={() => setSelectedTracker(name)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        currentTrackerName === name
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}

              {/* MAP & GPX TRACK ACTION BAR */}
              <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <h4 className="text-sm font-bold text-slate-900">
                        {currentTrackerName} — GPX Track ({allTrackPoints.length} points)
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      {totalTrackDistanceKm > 0 && (
                        <span>
                          Distance: <strong className="text-slate-800">{totalTrackDistanceKm.toFixed(2)} km</strong>
                        </span>
                      )}
                      <span>
                        Start: <strong className="text-slate-800">{allTrackPoints[0]?.time?.split(' ')[1] || 'N/A'}</strong>
                      </span>
                      <span>
                        Latest: <strong className="text-slate-800">{allTrackPoints[allTrackPoints.length - 1]?.time?.split(' ')[1] || 'N/A'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* BUTTONS: GOOGLE MAPS AND OPENSTREETMAP DISPLAYING ALL POINTS LIKE A GPX TRACK */}
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={googleMapsTrackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400 shadow-2xs transition-all cursor-pointer"
                      title={`Open complete ${allTrackPoints.length}-point GPX track route in Google Maps`}
                    >
                      <Route className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Google Maps (GPX Track)</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>

                    <a
                      href={osmTrackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-white px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400 shadow-2xs transition-all cursor-pointer"
                      title={`Open complete ${allTrackPoints.length}-point GPX polyline track in OpenStreetMap`}
                    >
                      <Map className="w-3.5 h-3.5 text-emerald-600" />
                      <span>OpenStreetMap (GPX Track)</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </div>
                </div>

                {/* Embedded Interactive OpenStreetMap with full GPX polyline track */}
                {allTrackPoints.length > 0 && (
                  <TrackMapView
                    points={allTrackPoints}
                    trackerName={currentTrackerName}
                  />
                )}
              </div>

              {/* Latest / Current Position Summary Card */}
              {currentLocation ? (
                <div className="bg-gradient-to-br from-indigo-50/70 to-sky-50/50 rounded-xl border border-indigo-100 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Compass className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Latest Fix Details ({currentTrackerName})
                      </h4>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100/80">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Latitude
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {currentLocation.lat}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100/80">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Longitude
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {currentLocation.lon}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100/80">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Timestamp
                      </span>
                      <span className="text-xs font-mono text-slate-800 truncate block">
                        {currentLocation.time || 'N/A'}
                      </span>
                    </div>

                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100/80">
                      <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                        Fix Count (FC)
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-600">
                        {currentLocation.FC ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-800 border border-amber-200">
                  No current position object found for {currentTrackerName}.
                </div>
              )}

              {/* History points list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Location Points Chronology ({historyPoints.length} valid points)</span>
                  </h4>
                  <button
                    onClick={() => handleDeleteTracker(currentTrackerName)}
                    disabled={deletingTracker === currentTrackerName}
                    className="text-xs text-rose-600 hover:text-rose-800 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete tracker "{currentTrackerName}" only</span>
                  </button>
                </div>

                {historyPoints.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                    No history points recorded for {currentTrackerName}.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Time</th>
                          <th className="py-2 px-3">Coordinates (Lat, Lon)</th>
                          <th className="py-2 px-3">FC</th>
                          <th className="py-2 px-3 text-right">Map Pin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {historyPoints.map((pt, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono text-slate-700">
                              {pt.time || '—'}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-800">
                              {pt.lat.toFixed(6)}, {pt.lon.toFixed(6)}
                            </td>
                            <td className="py-2 px-3 font-mono text-slate-600">
                              {pt.FC ?? '—'}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <a
                                href={`https://www.google.com/maps?q=${pt.lat},${pt.lon}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-0.5"
                              >
                                Pin <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* JSON Tab */
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase">
                  Raw JSON Payload
                </span>
                <button
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-96">
                {rawDayData ? JSON.stringify(rawDayData, null, 2) : '// No data loaded'}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
