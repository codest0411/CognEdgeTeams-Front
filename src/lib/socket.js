import { io } from 'socket.io-client'
import { supabase } from './supabaseClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

// Get auth token for socket connection
const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

// Main socket connection
export const createSocket = async () => {
  const token = await getAuthToken()
  
  return io(API_BASE_URL, {
    auth: { token },
    autoConnect: false
  })
}

// Chat socket connection
export const createChatSocket = async () => {
  const token = await getAuthToken()
  
  return io(`${API_BASE_URL}/chat`, {
    auth: { token },
    autoConnect: false
  })
}


// WebRTC signaling socket connection
export const createSignalingSocket = async () => {
  const token = await getAuthToken()
  
  return io(`${API_BASE_URL}/signaling`, {
    auth: { token },
    autoConnect: false
  })
}

// Tasks socket connection
export const createTasksSocket = async () => {
  const token = await getAuthToken()
  
  return io(`${API_BASE_URL}/tasks`, {
    auth: { token },
    autoConnect: false
  })
}

// Documents socket connection
export const createDocsSocket = async () => {
  const token = await getAuthToken()
  
  return io(`${API_BASE_URL}/docs`, {
    auth: { token },
    autoConnect: false
  })
}
