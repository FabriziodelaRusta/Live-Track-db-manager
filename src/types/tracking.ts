export interface TrackingPoint {
  lat: number;
  lon: number;
  time?: string;
  FC?: number;
  [key: string]: any;
}

export interface TrackerUser {
  current?: TrackingPoint;
  history?: (TrackingPoint | null)[];
  [key: string]: any;
}

export interface DayData {
  [trackerName: string]: TrackerUser;
}

export interface DaySummary {
  dateStr: string; // "YYYYMMDD"
  hasData: boolean;
  isLoading?: boolean;
  error?: string;
  trackerNames: string[];
  trackersCount: number;
  totalPointsCount: number;
  validPointsCount: number;
  raw?: DayData;
}

export interface RtdbConfig {
  databaseUrl: string;
  rootPath: string;
  authToken?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
}
