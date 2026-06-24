import * as categoryModel from '../models/category';
import { success, error } from '../utils/response';

export const list = async (ctx: any) => {
  try {
    const parent_id = ctx.query.parent_id;
    const tree = ctx.query.tree === 'true';
    if (tree) {
      const result = await categoryModel.getTree();
      success(ctx, result);
    } else {
      const filters: any = {};
      if (parent_id !== undefined) filters.parent_id = parent_id;
      const result = await categoryModel.list(filters);
      success(ctx, result);
    }
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const get = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const category = await categoryModel.findById(id);
    if (!category) {
      error(ctx, 404, 'Category not found');
      return;
    }
    success(ctx, category);
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const create = async (ctx: any) => {
  try {
    const data = ctx.request.body;
    const category = await categoryModel.create(data);
    success(ctx, category, 'Category created');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const update = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const data = ctx.request.body;
    const category = await categoryModel.update(id, data);
    if (!category) {
      error(ctx, 404, 'Category not found');
      return;
    }
    success(ctx, category, 'Category updated');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};

export const remove = async (ctx: any) => {
  try {
    const { id } = ctx.params;
    const deleted = await categoryModel.deleteById(id);
    if (!deleted) {
      error(ctx, 404, 'Category not found');
      return;
    }
    success(ctx, null, 'Category deleted');
  } catch (err: any) {
    error(ctx, 400, err.message);
  }
};
