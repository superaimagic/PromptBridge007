import * as tagModel from '../models/tag';
import { success, error } from '../utils/response';

export const list = async (ctx: any) => {
  try {
    const filters: any = {};
    if (ctx.query.search) filters.search = ctx.query.search;
    const result = await tagModel.list(filters);
    success(ctx, result);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const get = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const tag = await tagModel.findById(id);
    if (!tag) {
      error(ctx, 404, 'Tag not found');
      return;
    }
    success(ctx, tag);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const create = async (ctx: any) => {
  try {
    const data = ctx.request.body;
    const tag = await tagModel.create(data);
    success(ctx, tag, 'Tag created');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const update = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const data = ctx.request.body;
    const tag = await tagModel.update(id, data);
    if (!tag) {
      error(ctx, 404, 'Tag not found');
      return;
    }
    success(ctx, tag, 'Tag updated');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const remove = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const deleted = await tagModel.deleteById(id);
    if (!deleted) {
      error(ctx, 404, 'Tag not found');
      return;
    }
    success(ctx, null, 'Tag deleted');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};
