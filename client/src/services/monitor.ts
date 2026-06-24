import request from './request';

export const monitorAPI = {
  getOverview: () => request.get('/monitor/overview'),
  getPerformance: (params: any) => request.get('/monitor/performance', { params }),
  getCost: (params: any) => request.get('/monitor/cost', { params }),
  getAlerts: () => request.get('/monitor/alerts'),
  getWorkflowHealth: (id: string) => request.get(`/monitor/workflow/${id}/health`),
  getPromptHealth: (id: string) => request.get(`/monitor/prompt/${id}/health`),
};

export const feedbackAPI = {
  create: (data: any) => request.post('/feedbacks', data),
  list: (params: any) => request.get('/feedbacks', { params }),
};

export const metricAPI = {
  getEntityMetrics: (type: string, id: string, params?: any) =>
    request.get(`/metrics/entity/${type}/${id}`, { params }),
};
