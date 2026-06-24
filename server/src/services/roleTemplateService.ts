import * as roleTemplateModel from '../models/roleTemplate';
import { v4 as uuidv4 } from 'uuid';

export const createTemplate = async (data: {
  name: string;
  display_name: string;
  description?: string;
  icon?: string;
  workflow_ids?: string[];
  prompt_ids?: string[];
  metrics_config?: any;
  is_builtin?: number;
  sort_order?: number;
}, creatorId: string) => {
  return roleTemplateModel.create({
    id: uuidv4(),
    ...data,
    created_by: creatorId,
  });
};

export const updateTemplate = async (id: string, data: any) => {
  const template = await roleTemplateModel.update(id, data);
  if (!template) {
    throw new Error('Role template not found');
  }
  return template;
};

export const deleteTemplate = async (id: string) => {
  const deleted = await roleTemplateModel.deleteById(id);
  if (!deleted) {
    throw new Error('Role template not found');
  }
  return { success: true };
};

export const listTemplates = async (filters: {
  search?: string;
}, page: number, pageSize: number) => {
  return roleTemplateModel.list(filters, page, pageSize);
};

export const getTemplate = async (id: string) => {
  const template = await roleTemplateModel.findById(id);
  if (!template) {
    throw new Error('Role template not found');
  }
  return template;
};
