export interface ABTest {
  id: string;
  name: string;
  description: string;
  target_id: string;
  target_type: string;
  variants: ABTestVariant[];
  traffic_split: Record<string, number>;
  split_strategy: string;
  primary_metric: string;
  min_sample_size: number;
  status: 'draft' | 'running' | 'completed' | 'stopped';
  started_at: string;
  ended_at: string;
  winner: string;
  created_at: string;
}

export interface ABTestVariant {
  id: string;
  prompt_version: number;
  label: string;
}

export interface ABTestResult {
  id: string;
  test_id: string;
  variant_id: string;
  sample_size: number;
  metric_results: Record<string, { value: number; ci_lower: number; ci_upper: number }>;
  p_value: number;
  is_significant: boolean;
}
