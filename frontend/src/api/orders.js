import apiClient from './client'

export const orderApi = {
  list: (workspaceId, params) =>
    apiClient.get(`/workspaces/${workspaceId}/orders`, { params }).then((r) => r.data),
  get: (workspaceId, orderId) =>
    apiClient.get(`/workspaces/${workspaceId}/orders/${orderId}`).then((r) => r.data),
  create: (workspaceId, payload) =>
    apiClient.post(`/workspaces/${workspaceId}/orders`, payload).then((r) => r.data),
  confirm: (workspaceId, orderId) =>
    apiClient.post(`/workspaces/${workspaceId}/orders/${orderId}/confirm`).then((r) => r.data),
  complete: (workspaceId, orderId) =>
    apiClient.post(`/workspaces/${workspaceId}/orders/${orderId}/complete`).then((r) => r.data),
  cancel: (workspaceId, orderId) =>
    apiClient.post(`/workspaces/${workspaceId}/orders/${orderId}/cancel`).then((r) => r.data),
}

export const dashboardApi = {
  get: (workspaceId, params) =>
    apiClient.get(`/workspaces/${workspaceId}/dashboard`, { params }).then((r) => r.data),
}
