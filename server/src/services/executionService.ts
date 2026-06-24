import * as executionModel from '../models/execution';
import * as workflowModel from '../models/workflow';
import { v4 as uuidv4 } from 'uuid';

export const createExecution = async (data: {
  workflow_id: string;
  input?: any;
  triggered_by: string;
}) => {
  const workflow = await workflowModel.findById(data.workflow_id);
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const execution = await executionModel.create({
    id: uuidv4(),
    workflow_id: data.workflow_id,
    workflow_version: workflow.current_version,
    trigger_type: 'manual',
    triggered_by: data.triggered_by,
    input: data.input,
  });

  return execution;
};

export const getExecution = async (id: string) => {
  const execution = await executionModel.findById(id);
  if (!execution) {
    throw new Error('Execution not found');
  }
  const nodeExecutions = await executionModel.getNodeExecutions(id);
  return { ...execution, nodeExecutions };
};

export const listExecutions = async (workflowId: string, page: number, pageSize: number) => {
  return executionModel.listByWorkflow(workflowId, page, pageSize);
};

export const cancelExecution = async (id: string) => {
  const execution = await executionModel.findById(id);
  if (!execution) {
    throw new Error('Execution not found');
  }
  if (execution.status !== 'running' && execution.status !== 'pending') {
    throw new Error('Cannot cancel execution that is not running or pending');
  }
  await executionModel.updateStatus(id, 'cancelled');
  return { success: true };
};

export const getNodeExecutions = async (executionId: string) => {
  return executionModel.getNodeExecutions(executionId);
};
