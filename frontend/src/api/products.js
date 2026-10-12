import apiClient from './client'

export const productApi = {
  list: (workspaceId, params) =>
    apiClient.get(`/workspaces/${workspaceId}/products`, { params }).then((r) => r.data),
  get: (workspaceId, productId) =>
    apiClient.get(`/workspaces/${workspaceId}/products/${productId}`).then((r) => r.data),
  create: (workspaceId, payload) =>
    apiClient.post(`/workspaces/${workspaceId}/products`, payload).then((r) => r.data),
  update: (workspaceId, productId, payload) =>
    apiClient.put(`/workspaces/${workspaceId}/products/${productId}`, payload).then((r) => r.data),
  deactivate: (workspaceId, productId) =>
    apiClient.delete(`/workspaces/${workspaceId}/products/${productId}`).then((r) => r.data),
}

export const inventoryApi = {
  adjust: (workspaceId, productId, payload) =>
    apiClient.post(`/workspaces/${workspaceId}/products/${productId}/adjustments`, payload).then((r) => r.data),
  history: (workspaceId, params) =>
    apiClient.get(`/workspaces/${workspaceId}/inventory-adjustments`, { params }).then((r) => r.data),
}
