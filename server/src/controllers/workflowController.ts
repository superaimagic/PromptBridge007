import * as workflowService from '../services/workflowService';
import { success, error, paginate } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export const create = async (ctx: any) => {
  try {
    const creatorId = ctx.state.user.id;
    const data = ctx.request.body;
    const workflow = await workflowService.createWorkflow(data, creatorId);
    success(ctx, workflow, 'Workflow created');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const update = async (ctx: any) => {
  try {
    const userId = ctx.state.user.id;
    const { id } = ctx.params;
    const data = ctx.request.body;
    const workflow = await workflowService.updateWorkflow(id, data, userId);
    success(ctx, workflow, 'Workflow updated');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const get = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const workflow = await workflowService.getWorkflow(id);
    success(ctx, workflow);
  } catch (err: any) {
    error(ctx, 404, err.message);
  }
};

export const list = async (ctx: any) => {
  try {
    const { page, pageSize } = parsePagination(ctx.query);
    const filters = {
      is_published: ctx.query.is_published !== undefined ? parseInt(ctx.query.is_published) : undefined,
      search: ctx.query.search,
      category: ctx.query.category,
      workspace_id: ctx.query.workspace_id,
    };
    const result = await workflowService.listWorkflows(filters, page, pageSize);
    paginate(ctx, result.list, result.total, page, pageSize);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const publish = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const workflow = await workflowService.publishWorkflow(id);
    success(ctx, workflow, 'Workflow published');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const archive = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const workflow = await workflowService.archiveWorkflow(id);
    success(ctx, workflow, 'Workflow archived');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const remove = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const result = await workflowService.deleteWorkflow(id);
    success(ctx, result, 'Workflow deleted');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getVersions = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const versions = await workflowService.getVersions(id);
    success(ctx, versions);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const saveVersion = async (ctx: any) => {
  try {
    const userId = ctx.state.user.id;
    const { id } = ctx.params;
    const data = ctx.request.body;
    const version = await workflowService.saveVersion(id, data, userId);
    success(ctx, version, 'Version saved');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};
