import * as roleTemplateService from '../services/roleTemplateService';
import { success, error, paginate } from '../utils/response';
import { parsePagination } from '../utils/pagination';

export const create = async (ctx: any) => {
  try {
    const creatorId = ctx.state.user.id;
    const data = ctx.request.body;
    const template = await roleTemplateService.createTemplate(data, creatorId);
    success(ctx, template, 'Role template created');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const update = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const data = ctx.request.body;
    const template = await roleTemplateService.updateTemplate(id, data);
    success(ctx, template, 'Role template updated');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const remove = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const result = await roleTemplateService.deleteTemplate(id);
    success(ctx, result, 'Role template deleted');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const list = async (ctx: any) => {
  try {
    const { page, pageSize } = parsePagination(ctx.query);
    const filters = {
      search: ctx.query.search,
    };
    const result = await roleTemplateService.listTemplates(filters, page, pageSize);
    paginate(ctx, result.list, result.total, page, pageSize);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const get = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const template = await roleTemplateService.getTemplate(id);
    success(ctx, template);
  } catch (err: any) {
    error(ctx, 404, err.message);
  }
};

export const useTemplate = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const template = await roleTemplateService.getTemplate(id);
    success(ctx, template, 'Template usage recorded');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};
