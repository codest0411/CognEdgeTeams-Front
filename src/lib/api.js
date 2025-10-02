
import { supabase } from './supabaseClient'
// Users API
export const usersApi = {
  lookupByEmail: (email) => apiRequest(`/api/users/lookup?email=${encodeURIComponent(email)}`)
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

// Get auth headers for API requests
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`
  }
}

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers,
    ...options
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || 'API request failed')
  }

  return response.json()
}


// Tasks API
export const tasksApi = {
  getTasks: () => apiRequest('/api/tasks'),
  
  createTask: (task) => 
    apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task)
    }),
  
  updateTask: (id, updates) => 
    apiRequest(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
  
  deleteTask: (id) => 
    apiRequest(`/api/tasks/${id}`, {
      method: 'DELETE'
    })
}

// Documents API
export const documentsApi = {
  getDocuments: () => apiRequest('/api/documents'),
  
  getDocument: (id) => apiRequest(`/api/documents/${id}`),
  
  createDocument: (document) => 
    apiRequest('/api/documents', {
      method: 'POST',
      body: JSON.stringify(document)
    }),
  
  updateDocument: (id, updates) => 
    apiRequest(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
  
  deleteDocument: (id) => 
    apiRequest(`/api/documents/${id}`, {
      method: 'DELETE'
    })
}

// Teams API
export const teamsApi = {
  getTeams: () => apiRequest('/api/teams'),
  
  createTeam: (team) => 
    apiRequest('/api/teams', {
      method: 'POST',
      body: JSON.stringify(team)
    }),
  
  getTeamMembers: (teamId) => 
    apiRequest(`/api/teams/${teamId}/members`),
  
  addTeamMember: (teamId, userId, role = 'member') => 
    apiRequest(`/api/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role })
    })
}

// Profile API
export const profileApi = {
  getProfile: () => apiRequest('/api/profile')
}
