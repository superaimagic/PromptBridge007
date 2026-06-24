import * as monitorModel from '../models/monitor';
import { v4 as uuidv4 } from 'uuid';

export const getOverview = async () => {
  return monitorModel.getOverview();
};

export const getExecutionMetrics = async (startDate: string, endDate: string, groupBy: string) => {
  return monitorModel.getExecutionMetrics(startDate, endDate, groupBy || 'day');
};

export const getNodeMetrics = async (startDate: string, endDate: string) => {
  return monitorModel.getNodeMetrics(startDate, endDate);
};

export const recordMetric = async (data: {
  entity_type: string;
  entity_id: string;
  metric_name: string;
  value: number;
  value_type: string;
  period_start: string;
  period_end: string;
  period_type: string;
  dimensions?: any;
}) => {
  return monitorModel.recordMetricSnapshot({
    id: uuidv4(),
    ...data,
  });
};

export const getMetricSnapshots = async (
  entityType: string,
  entityId: string,
  metricName?: string,
  page?: number,
  pageSize?: number
) => {
  return monitorModel.getMetricSnapshots(entityType, entityId, metricName, page, pageSize);
};
