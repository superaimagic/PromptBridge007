import * as promptModel from '../models/prompt';
import { v4 as uuidv4 } from 'uuid';

export const createPrompt = async (data: {
  title: string;
  content: string;
  description?: string;
  category_id?: string;
  tag_ids?: string[];
  variables?: any[];
  model_config?: any;
  visibility?: string;
  workspace_id?: string;
}, creatorId: string) => {
  return promptModel.create({
    id: uuidv4(),
    ...data,
    created_by: creatorId,
  });
};

export const updatePrompt = async (id: string, data: {
  title?: string;
  content?: string;
  description?: string;
  category_id?: string;
  tag_ids?: string[];
  variables?: any[];
  model_config?: any;
  visibility?: string;
  changelog?: string;
}, userId: string) => {
  const prompt = await promptModel.update(id, data, userId);
  if (!prompt) {
    throw new Error('Prompt not found');
  }
  return prompt;
};

export const getPrompt = async (id: string) => {
  const prompt = await promptModel.findById(id);
  if (!prompt) {
    throw new Error('Prompt not found');
  }
  return prompt;
};

export const listPrompts = async (filters: {
  category_id?: string;
  visibility?: string;
  search?: string;
  workspace_id?: string;
}, page: number, pageSize: number) => {
  return promptModel.list(filters, page, pageSize);
};

export const publishPrompt = async (id: string) => {
  // Use visibility = 'public' as "published"
  const prompt = await promptModel.update(id, { visibility: 'public' }, 'system');
  if (!prompt) {
    throw new Error('Prompt not found');
  }
  return prompt;
};

export const archivePrompt = async (id: string) => {
  const deleted = await promptModel.softDelete(id);
  if (!deleted) {
    throw new Error('Prompt not found');
  }
  return { success: true };
};

export const deletePrompt = async (id: string) => {
  const deleted = await promptModel.deleteById(id);
  if (!deleted) {
    throw new Error('Prompt not found');
  }
  return { success: true };
};

export const getVersions = async (promptId: string) => {
  return promptModel.getVersions(promptId);
};

export const getVersion = async (promptId: string, version: number) => {
  const v = await promptModel.getVersion(promptId, version);
  if (!v) {
    throw new Error('Version not found');
  }
  return v;
};
