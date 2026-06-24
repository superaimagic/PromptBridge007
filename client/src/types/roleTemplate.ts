export interface RoleTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  workflow_ids: string[];
  prompt_ids: string[];
  metrics_config: any;
  is_builtin: number;
  sort_order: number;
  created_at: string;
}
