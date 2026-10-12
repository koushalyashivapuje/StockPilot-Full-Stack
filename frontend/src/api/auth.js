import apiClient from './client'

export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload).then((r) => r.data),
  login: (payload) => apiClient.post('/auth/login', payload).then((r) => r.data),
  addStaff: (workspaceId, payload) =>
    apiClient.post(`/auth/workspaces/${workspaceId}/staff`, payload).then((r) => r.data),
}

export const workspaceApi = {
  members: (workspaceId) => apiClient.get(`/workspaces/${workspaceId}/members`).then((r) => r.data),
}
