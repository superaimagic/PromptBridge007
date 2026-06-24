import { create } from 'zustand';
import { workflowAPI } from '@/services/workflow';
import type { Workflow, WorkflowVersion } from '@/types/workflow';
import type { PaginatedResponse } from '@/types/common';

interface WorkflowState {
  workflows: Workflow[];
  total: number;
  currentWorkflow: Workflow | null;
  loading: boolean;
  fetchWorkflows: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    category?: string;
  }) => Promise<void>;
  fetchWorkflowById: (id: string) => Promise<void>;
  createWorkflow: (data: Partial<Workflow>) => Promise<Workflow>;
  updateWorkflow: (id: string, data: Partial<Workflow>) => Promise<Workflow>;
  saveVersion: (id: string, data: Partial<WorkflowVersion>) => Promise<WorkflowVersion>;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  workflows: [],
  total: 0,
  currentWorkflow: null,
  loading: false,

  fetchWorkflows: async (params) => {
    set({ loading: true });
    try {
      const res = await workflowAPI.list(params);
      const data = res.data as PaginatedResponse<Workflow>;
      set({ workflows: data.list, total: data.total, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchWorkflowById: async (id) => {
    set({ loading: true });
    try {
      const res = await workflowAPI.getById(id);
      set({ currentWorkflow: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createWorkflow: async (data) => {
    const res = await workflowAPI.create(data);
    return res.data;
  },

  updateWorkflow: async (id, data) => {
    const res = await workflowAPI.update(id, data);
    set({ currentWorkflow: res.data });
    return res.data;
  },

  saveVersion: async (id, data) => {
    const res = await workflowAPI.saveVersion(id, data);
    return res.data;
  },
}));
