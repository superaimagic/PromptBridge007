import * as executionService from '../services/executionService';
import { success, error, paginate } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export const create = async (ctx: any) => {
  try {
    const triggeredBy = ctx.state.user.id;
    const data = ctx.request.body;
    const execution = await executionService.createExecution({
      workflow_id: data.workflowId || data.workflow_id,
      input: data.inputData || data.input,
      triggered_by: triggeredBy,
    });
    success(ctx, execution, 'Execution created');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const get = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const execution = await executionService.getExecution(id);
    success(ctx, execution);
  } catch (err: any) {
    error(ctx, 404, err.message);
  }
};

export const list = async (ctx: any) => {
  try {
    const { page, pageSize } = parsePagination(ctx.query);
    const workflowId = ctx.query.workflow_id || '';
    const result = await executionService.listExecutions(workflowId, page, pageSize);
    paginate(ctx, result.list, result.total, page, pageSize);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const cancel = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const result = await executionService.cancelExecution(id);
    success(ctx, result, 'Execution cancelled');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getNodeExecutions = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const nodeExecutions = await executionService.getNodeExecutions(id);
    success(ctx, nodeExecutions);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};
