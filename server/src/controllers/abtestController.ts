import * as abtestService from '../services/abtestService';
import { success, error, paginate } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export const create = async (ctx: any) => {
  try {
    const creatorId = ctx.state.user.id;
    const data = ctx.request.body;
    const test = await abtestService.createTest(data, creatorId);
    success(ctx, test, 'A/B test created');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const update = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const data = ctx.request.body;
    const test = await abtestService.updateTest(id, data);
    success(ctx, test, 'A/B test updated');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const start = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const test = await abtestService.startTest(id);
    success(ctx, test, 'A/B test started');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const stop = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const { winner } = ctx.request.body || {};
    const test = await abtestService.stopTest(id, winner);
    success(ctx, test, 'A/B test stopped');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const remove = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const result = await abtestService.deleteTest(id);
    success(ctx, result, 'A/B test deleted');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const list = async (ctx: any) => {
  try {
    const { page, pageSize } = parsePagination(ctx.query);
    const filters = {
      status: ctx.query.status,
      target_id: ctx.query.target_id,
    };
    const result = await abtestService.listTests(filters, page, pageSize);
    paginate(ctx, result.list, result.total, page, pageSize);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const get = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const test = await abtestService.getTest(id);
    success(ctx, test);
  } catch (err: any) {
    error(ctx, 404, err.message);
  }
};

export const addResult = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const userId = ctx.state.user.id;
    const data = ctx.request.body;
    const result = await abtestService.addResult({
      test_id: id,
      variant_id: data.variant_id,
      sample_size: data.sample_size,
      metric_results: data.metric_results,
      p_value: data.p_value,
      is_significant: data.is_significant,
    });
    success(ctx, result, 'Result added');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getResults = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const results = await abtestService.getResults(id);
    success(ctx, results);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getStats = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const stats = await abtestService.getStats(id);
    success(ctx, stats);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};
