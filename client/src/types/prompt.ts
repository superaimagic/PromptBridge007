export interface Variable {
  name: string;
  type: string;
  required: boolean;
  default: string;
  description: string;
  options?: string[];
}

export interface ModelConfig {
  model: string;
  provider: string;
  temperature: number;
  max_tokens: number;
}

export interface PromptMetrics {
  avg_score: number;
  usage_count: number;
  adopt_rate: number;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  icon: string;
  children?: Category[];
}

export interface Prompt {
  id: string;
  title: string;
  description: string;
  content: string;
  variables: Variable[];
  model_config: ModelConfig;
  current_version: number;
  created_by: string;
  category_id: string;
  visibility: 'private' | 'workspace' | 'public';
  metrics: PromptMetrics;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  category?: Category;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version: number;
  version_tag: string;
  content: string;
  variables: Variable[];
  model_config: ModelConfig;
  change_type: string;
  change_log: string;
  execution_count: number;
  avg_score: number;
  is_stable: number;
  is_current: number;
  created_by: string;
  created_at: string;
}
