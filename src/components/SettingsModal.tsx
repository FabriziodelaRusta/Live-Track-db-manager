import React, { useState } from 'react';
import { X, Database, Save, RotateCcw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { RtdbConfig } from '../types/tracking';
import { DEFAULT_RTDB_CONFIG, rtdbService } from '../services/firebaseRtdb';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: RtdbConfig;
  onSaveConfig: (newConfig: RtdbConfig) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}) => {
  const [dbUrl, setDbUrl] = useState(config.databaseUrl);
  const [rootPath, setRootPath] = useState(config.rootPath);
  const [authToken, setAuthToken] = useState(config.authToken || '');
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success?: boolean;
    message?: string;
  }>({ tested: false });
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult({ tested: false });
    try {
      const tempService = new (rtdbService.constructor as any)({
        databaseUrl: dbUrl,
        rootPath,
        authToken,
      });
      const res = await tempService.testConnection();
      setTestResult({ tested: true, success: res.success, message: res.message });
    } catch (e: any) {
      setTestResult({ tested: true, success: false, message: e.message });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig({
      databaseUrl: dbUrl.trim(),
      rootPath: rootPath.trim(),
      authToken: authToken.trim(),
    });
    onClose();
  };

  const handleReset = () => {
    setDbUrl(DEFAULT_RTDB_CONFIG.databaseUrl);
    setRootPath(DEFAULT_RTDB_CONFIG.rootPath);
    setAuthToken(DEFAULT_RTDB_CONFIG.authToken || '');
    setTestResult({ tested: false });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Database Connection Settings</h3>
              <p className="text-xs text-slate-500">Firebase Realtime Database REST API target</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Firebase RTDB URL
            </label>
            <input
              type="text"
              value={dbUrl}
              onChange={(e) => setDbUrl(e.target.value)}
              placeholder="https://your-project-default-rtdb.europe-west1.firebasedatabase.app"
              className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Currently connected to: <code className="text-slate-700">live-track-799f8-default-rtdb</code>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Root Tracking Path
            </label>
            <input
              type="text"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="tracking"
              className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Default is <code className="text-slate-700 font-semibold">tracking</code> (where dates YYYYMMDD reside)
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Optional Auth / Secret Token
            </label>
            <input
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Leave empty if public or rules allow direct access"
              className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Appends <code className="text-slate-700">?auth=TOKEN</code> to REST queries if provided.
            </p>
          </div>

          {/* Test Status feedback */}
          {testResult.tested && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span className="font-medium">{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                  <span>Testing connection...</span>
                </>
              ) : (
                <span>Test Connection Ping</span>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
