import * as workflowModel from '../models/workflow';
import { v4 as uuidv4 } from 'uuid';

export const createWorkflow = async (data: {
  name: string;
  description?: string;
  config?: any;
  input_schema?: any;
  output_schema?: any;
  workspace_id?: string;
  category?: string;
  role_id?: string;
  tag_ids?: string[];
}, creatorId: string) => {
  return workflowModel.create({
    id: uuidv4(),
    ...data,
    created_by: creatorId,
  });
};

export const updateWorkflow = async (id: string, data: {
  name?: string;
  description?: string;
  config?: any;
  input_schema?: any;
  output_schema?: any;
  category?: string;
  role_id?: string;
  tag_ids?: string[];
  changelog?: string;
}, userId: string) => {
  const workflow = await workflowModel.update(id, data, userId);
  if (!workflow) {
    throw new Error('Workflow not found');
  }
  return workflow;
};

export const getWorkflow = async (id: string) => {
  const workflow = await workflowModel.findById(id);
  if (!workflow) {
    throw new Error('Workflow not found');
  }
  return workflow;
};

export const listWorkflows = async (filters: {
  is_published?: number;
  search?: string;
  category?: string;
  workspace_id?: string;
}, page: number, pageSize: number) => {
  return workflowModel.list(filters, page, pageSize);
};

export const publishWorkflow = async (id: string) => {
  const workflow = await workflowModel.publish(id);
  if (!workflow) {
    throw new Error('Workflow not found');
  }
  return workflow;
};

export const archiveWorkflow = async (id: string) => {
  const deleted = await workflowModel.softDelete(id);
  if (!deleted) {
    throw new Error('Workflow not found');
  }
  return { success: true };
};

export const deleteWorkflow = async (id: string) => {
  const deleted = await workflowModel.deleteById(id);
  if (!deleted) {
    throw new Error('Workflow not found');
  }
  return { success: true };
};

export const getVersions = async (workflowId: string) => {
  return workflowModel.getVersions(workflowId);
};

export const saveVersion = async (workflowId: string, data: {
  definition: any;
  changelog?: string;
}, userId: string) => {
  return workflowModel.saveVersion(workflowId, data, userId);
};
