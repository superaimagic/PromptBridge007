export interface MonitorOverview {
  todayExecutions: number;
  runningCount: number;
  successRate: number;
  avgDurationMs: number;
  todayCostUsd: number;
  todayTokens: number;
  healthTrend: { time: string; value: number }[];
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: 'warning' | 'error';
  createdAt: string;
}

export interface Feedback {
  id: string;
  target_id: string;
  target_type: string;
  feedback_type: string;
  rating: number;
  comment: string;
  created_at: string;
}
