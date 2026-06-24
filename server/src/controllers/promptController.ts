import * as promptService from '../services/promptService';
import { success, error, paginate } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export const create = async (ctx: any) => {
  try {
    const creatorId = ctx.state.user.id;
    const data = ctx.request.body;
    const prompt = await promptService.createPrompt(data, creatorId);
    success(ctx, prompt, 'Prompt created');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const update = async (ctx: any) => {
  try {
    const userId = ctx.state.user.id;
    const { id } = ctx.params;
    const data = ctx.request.body;
    const prompt = await promptService.updatePrompt(id, data, userId);
    success(ctx, prompt, 'Prompt updated');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const get = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const prompt = await promptService.getPrompt(id);
    success(ctx, prompt);
  } catch (err: any) {
    error(ctx, 404, err.message);
  }
};

export const list = async (ctx: any) => {
  try {
    const { page, pageSize, offset } = parsePagination(ctx.query);
    const filters = {
      category_id: ctx.query.category_id,
      visibility: ctx.query.visibility,
      search: ctx.query.search,
      workspace_id: ctx.query.workspace_id,
    };
    const result = await promptService.listPrompts(filters, page, pageSize);
    paginate(ctx, result.list, result.total, page, pageSize);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const publish = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const prompt = await promptService.publishPrompt(id);
    success(ctx, prompt, 'Prompt published');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const archive = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const prompt = await promptService.archivePrompt(id);
    success(ctx, prompt, 'Prompt archived');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const remove = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const result = await promptService.deletePrompt(id);
    success(ctx, result, 'Prompt deleted');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getVersions = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const versions = await promptService.getVersions(id);
    success(ctx, versions);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const getVersion = async (ctx: any) => {
  try {
    const { id, version } = ctx.params;
    const v = await promptService.getVersion(id, parseInt(version));
    success(ctx, v);
  } catch (err: any) {
    error(ctx, 404, err.message);
  }
};
