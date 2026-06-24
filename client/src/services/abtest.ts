import request from './request';

export const abtestAPI = {
  list: (params?: any) => request.get('/ab-tests', { params }),
  getById: (id: string) => request.get(`/ab-tests/${id}`),
  create: (data: any) => request.post('/ab-tests', data),
  update: (id: string, data: any) => request.put(`/ab-tests/${id}`, data),
  start: (id: string) => request.post(`/ab-tests/${id}/start`),
  stop: (id: string) => request.post(`/ab-tests/${id}/stop`),
  getResults: (id: string) => request.get(`/ab-tests/${id}/results`),
  promote: (id: string) => request.post(`/ab-tests/${id}/promote`),
};
