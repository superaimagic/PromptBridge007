import * as monitorService from '../services/monitorService';
import { success, error, paginate } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export const overview = async (ctx: any) => {
  try {
    const result = await monitorService.getOverview();
    success(ctx, result);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getExecutionMetrics = async (ctx: any) => {
  try {
    const startDate = ctx.query.start_date || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const endDate = ctx.query.end_date || new Date().toISOString().split('T')[0];
    const groupBy = ctx.query.group_by || 'day';
    const result = await monitorService.getExecutionMetrics(startDate, endDate, groupBy);
    success(ctx, result);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getNodeMetrics = async (ctx: any) => {
  try {
    const startDate = ctx.query.start_date || new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().split('T')[0];
    const endDate = ctx.query.end_date || new Date().toISOString().split('T')[0];
    const result = await monitorService.getNodeMetrics(startDate, endDate);
    success(ctx, result);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const recordMetric = async (ctx: any) => {
  try {
    const data = ctx.request.body;
    const metric = await monitorService.recordMetric(data);
    success(ctx, metric, 'Metric recorded');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getMetrics = async (ctx: any) => {
  try {
    const { page, pageSize } = parsePagination(ctx.query);
    const entityType = ctx.query.entity_type || 'PROMPT';
    const entityId = ctx.query.entity_id || '';
    const metricName = ctx.query.metric_name;
    const result = await monitorService.getMetricSnapshots(entityType, entityId, metricName, page, pageSize);
    paginate(ctx, result.list, result.total, page, pageSize);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};
