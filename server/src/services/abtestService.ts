import * as abtestModel from '../models/abtest';
import { v4 as uuidv4 } from 'uuid';

export const createTest = async (data: {
  name: string;
  description?: string;
  target_id: string;
  variants: any[];
  traffic_split?: any;
  split_strategy?: string;
  primary_metric: string;
  secondary_metrics?: any;
  min_sample_size?: number;
  max_duration_days?: number;
  significance_level?: number;
}, creatorId: string) => {
  return abtestModel.create({
    id: uuidv4(),
    ...data,
    created_by: creatorId,
  });
};

export const updateTest = async (id: string, data: any) => {
  const test = await abtestModel.update(id, data);
  if (!test) {
    throw new Error('A/B test not found');
  }
  return test;
};

export const startTest = async (id: string) => {
  const test = await abtestModel.start(id);
  if (!test) {
    throw new Error('A/B test not found');
  }
  return test;
};

export const stopTest = async (id: string, winner?: string) => {
  const test = await abtestModel.stop(id, winner);
  if (!test) {
    throw new Error('A/B test not found');
  }
  return test;
};

export const deleteTest = async (id: string) => {
  const deleted = await abtestModel.deleteById(id);
  if (!deleted) {
    throw new Error('A/B test not found');
  }
  return { success: true };
};

export const listTests = async (filters: { status?: string; target_id?: string }, page: number, pageSize: number) => {
  return abtestModel.list(filters, page, pageSize);
};

export const getTest = async (id: string) => {
  const test = await abtestModel.findById(id);
  if (!test) {
    throw new Error('A/B test not found');
  }
  return test;
};

export const addResult = async (data: {
  test_id: string;
  variant_id: string;
  sample_size: number;
  metric_results: any;
  p_value?: number;
  is_significant?: boolean;
}) => {
  return abtestModel.addResult({
    id: uuidv4(),
    ...data,
  });
};

export const getResults = async (testId: string) => {
  return abtestModel.getResults(testId);
};

export const getStats = async (testId: string) => {
  return abtestModel.getStats(testId);
};
