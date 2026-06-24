import request from './request';

export const roleTemplateAPI = {
  list: () => request.get('/role-templates'),
  getById: (id: string) => request.get(`/role-templates/${id}`),
  create: (data: any) => request.post('/role-templates', data),
  update: (id: string, data: any) => request.put(`/role-templates/${id}`, data),
  delete: (id: string) => request.delete(`/role-templates/${id}`),
  instantiate: (id: string, data: any) => request.post(`/role-templates/${id}/instantiate`, data),
  getMetrics: (id: string) => request.get(`/role-templates/${id}/metrics`),
};
