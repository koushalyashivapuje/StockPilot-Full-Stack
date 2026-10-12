import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export const apiClient = axios.create({ baseURL })

// Attach the JWT (if present) to every outgoing request.
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('stockpilot_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Normalize errors into a single shape the UI can render, and log the user out on 401.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const data = error.response?.data

    if (status === 401) {
      localStorage.removeItem('stockpilot_token')
      localStorage.removeItem('stockpilot_user')
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login')
      }
    }

    const normalized = {
      status,
      message: data?.message || error.message || 'Something went wrong. Please try again.',
      fieldErrors: data?.fieldErrors || [],
    }
    return Promise.reject(normalized)
  },
)

export default apiClient
