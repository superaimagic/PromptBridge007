import { create } from 'zustand';
import { promptAPI } from '@/services/prompt';
import type { Prompt } from '@/types/prompt';
import type { PaginatedResponse } from '@/types/common';

interface PromptState {
  prompts: Prompt[];
  total: number;
  currentPrompt: Prompt | null;
  loading: boolean;
  fetchPrompts: (params: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    categoryId?: string;
    visibility?: string;
  }) => Promise<void>;
  fetchPromptById: (id: string) => Promise<void>;
  createPrompt: (data: Partial<Prompt>) => Promise<Prompt>;
  updatePrompt: (id: string, data: Partial<Prompt>) => Promise<Prompt>;
  deletePrompt: (id: string) => Promise<void>;
}

export const usePromptStore = create<PromptState>((set) => ({
  prompts: [],
  total: 0,
  currentPrompt: null,
  loading: false,

  fetchPrompts: async (params) => {
    set({ loading: true });
    try {
      const res = await promptAPI.list(params);
      const data = res.data as PaginatedResponse<Prompt>;
      set({ prompts: data.list, total: data.total, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  fetchPromptById: async (id) => {
    set({ loading: true });
    try {
      const res = await promptAPI.getById(id);
      set({ currentPrompt: res.data, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createPrompt: async (data) => {
    const res = await promptAPI.create(data);
    return res.data;
  },

  updatePrompt: async (id, data) => {
    const res = await promptAPI.update(id, data);
    set({ currentPrompt: res.data });
    return res.data;
  },

  deletePrompt: async (id) => {
    await promptAPI.delete(id);
    set((state) => ({
      prompts: state.prompts.filter((p) => p.id !== id),
      total: state.total - 1,
    }));
  },
}));
