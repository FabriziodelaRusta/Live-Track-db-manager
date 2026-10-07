import { DayData, DaySummary, RtdbConfig } from '../types/tracking';

export const DEFAULT_RTDB_CONFIG: RtdbConfig = {
  databaseUrl: 'https://live-track-799f8-default-rtdb.europe-west1.firebasedatabase.app',
  rootPath: 'tracking',
  authToken: '',
};

const STORAGE_KEY = 'live_track_rtdb_config';

export function getStoredConfig(): RtdbConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_RTDB_CONFIG,
        ...parsed,
        databaseUrl: (parsed.databaseUrl || DEFAULT_RTDB_CONFIG.databaseUrl).replace(/\/+$/, ''),
      };
    }
  } catch (e) {
    console.error('Failed to load stored config', e);
  }
  return DEFAULT_RTDB_CONFIG;
}

export function saveStoredConfig(config: RtdbConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save config', e);
  }
}

export class FirebaseRtdbService {
  private config: RtdbConfig;

  constructor(config?: RtdbConfig) {
    this.config = config || getStoredConfig();
  }

  public setConfig(config: RtdbConfig) {
    this.config = {
      ...config,
      databaseUrl: config.databaseUrl.replace(/\/+$/, ''),
      rootPath: config.rootPath.replace(/^\/+|\/+$/g, ''),
    };
    saveStoredConfig(this.config);
  }

  public getConfig(): RtdbConfig {
    return { ...this.config };
  }

  private buildUrl(path: string, params: Record<string, string> = {}): string {
    const cleanBase = this.config.databaseUrl.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+|\/+$/g, '');
    let url = `${cleanBase}/${cleanPath}.json`;

    const searchParams = new URLSearchParams();
    if (this.config.authToken && this.config.authToken.trim()) {
      searchParams.set('auth', this.config.authToken.trim());
    }
    for (const [k, v] of Object.entries(params)) {
      searchParams.set(k, v);
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    return url;
  }

  public async testConnection(): Promise<{ success: boolean; message: string; dateCount?: number }> {
    try {
      const url = this.buildUrl(this.config.rootPath, { shallow: 'true' });
      const response = await fetch(url);
      if (!response.ok) {
        return {
          success: false,
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      const data = await response.json();
      if (data === null) {
        return { success: true, message: 'Connected successfully (path is currently empty)', dateCount: 0 };
      }
      const count = typeof data === 'object' ? Object.keys(data).length : 0;
      return { success: true, message: `Connected to Firebase RTDB Live_track (${count} dates found)`, dateCount: count };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network connection failed' };
    }
  }

  /**
   * Fetches all date keys present in tracking/ with shallow=true (fast & lightweight)
   */
  public async fetchAllDateKeys(): Promise<string[]> {
    const url = this.buildUrl(this.config.rootPath, { shallow: 'true' });
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch dates: HTTP ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (!data || typeof data !== 'object') {
      return [];
    }
    // Filter keys that look like YYYYMMDD
    return Object.keys(data).sort();
  }

  /**
   * Fetches the tracking data for a specific date (e.g. "20260630")
   */
  public async fetchDateData(dateStr: string): Promise<DayData | null> {
    const path = `${this.config.rootPath}/${dateStr}`;
    const url = this.buildUrl(path);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data for ${dateStr}: HTTP ${response.status}`);
    }
    const data = await response.json();
    return data;
  }

  /**
   * Summarizes raw DayData into counts
   */
  public parseDaySummary(dateStr: string, data: DayData | null): DaySummary {
    if (!data || typeof data !== 'object') {
      return {
        dateStr,
        hasData: false,
        trackerNames: [],
        trackersCount: 0,
        totalPointsCount: 0,
        validPointsCount: 0,
        raw: undefined,
      };
    }

    const trackerNames = Object.keys(data);
    let totalPoints = 0;
    let validPoints = 0;

    for (const name of trackerNames) {
      const tracker = data[name];
      if (tracker) {
        if (tracker.current) {
          totalPoints += 1;
          validPoints += 1;
        }
        if (Array.isArray(tracker.history)) {
          totalPoints += tracker.history.length;
          validPoints += tracker.history.filter(Boolean).length;
        } else if (tracker.history && typeof tracker.history === 'object') {
          const histKeys = Object.keys(tracker.history);
          totalPoints += histKeys.length;
          validPoints += histKeys.length;
        }
      }
    }

    return {
      dateStr,
      hasData: trackerNames.length > 0,
      trackerNames,
      trackersCount: trackerNames.length,
      totalPointsCount: totalPoints,
      validPointsCount: validPoints,
      raw: data,
    };
  }

  /**
   * Deletes all entries for a specific date in the DB: DELETE /tracking/{dateStr}.json
   */
  public async deleteDate(dateStr: string): Promise<void> {
    const path = `${this.config.rootPath}/${dateStr}`;
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete entries for ${dateStr}: HTTP ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Global delete for all dates in a month.
   * Can use PATCH with null values for an atomic delete, or sequential DELETEs.
   */
  public async deleteMonthDates(dateKeys: string[]): Promise<{ deletedCount: number }> {
    if (!dateKeys.length) return { deletedCount: 0 };

    // Firebase RTDB allows atomic removal by sending PATCH with { [key]: null }
    const patchBody: Record<string, null> = {};
    for (const key of dateKeys) {
      patchBody[key] = null;
    }

    const url = this.buildUrl(this.config.rootPath);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patchBody),
    });

    if (!response.ok) {
      // Fallback: delete sequentially if patch had an issue
      let count = 0;
      for (const d of dateKeys) {
        await this.deleteDate(d);
        count++;
      }
      return { deletedCount: count };
    }

    return { deletedCount: dateKeys.length };
  }

  /**
   * Delete a specific tracker from a date: DELETE /tracking/{dateStr}/{trackerName}.json
   */
  public async deleteTracker(dateStr: string, trackerName: string): Promise<void> {
    const path = `${this.config.rootPath}/${dateStr}/${trackerName}`;
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete tracker ${trackerName} for ${dateStr}: HTTP ${response.status}`);
    }
  }
}

export const rtdbService = new FirebaseRtdbService();
