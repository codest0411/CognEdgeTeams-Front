import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Mock user for development when Supabase is not configured
      setUser({
        id: 'dev-user-001',
        email: 'dev@example.com',
        user_metadata: { full_name: 'Dev User' }
      })
      setLoading(false)
      return
    }

    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
      setLoading(false)
      
      // Store token in localStorage for socket.io authentication
      if (session?.access_token) {
        localStorage.setItem('token', session.access_token)
        console.log('✅ Initial token stored in localStorage')
      }
      
      // If user is already authenticated and on auth pages, redirect to home
      if (session?.user) {
        const currentPath = window.location.pathname
        const authPages = ['/login', '/signup']
        
        if (authPages.includes(currentPath)) {
          console.log('User already authenticated, redirecting to CognEdgeTeam')
          navigate('/app/home')
        }
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email)
        setUser(session?.user ?? null)
        setLoading(false)

        // Store token in localStorage for socket.io authentication
        if (session?.access_token) {
          localStorage.setItem('token', session.access_token)
          console.log('✅ Token stored in localStorage')
        } else {
          localStorage.removeItem('token')
          console.log('🗑️ Token removed from localStorage')
        }

        if (event === 'SIGNED_IN') {
          console.log('User signed in, current path:', window.location.pathname)
          
          // Redirect to home page after successful login from any auth page
          const authPages = ['/login', '/signup', '/']
          const currentPath = window.location.pathname
          
          if (authPages.includes(currentPath) || currentPath === '/') {
            console.log('Redirecting to /app/home after login')
            navigate('/app/home')
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, redirecting to home')
          navigate('/')
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const signUp = async (email, password, metadata = {}) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please add your Supabase URL and keys to continue.')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    if (error) throw error
    return data
  }

  const signIn = async (email, password) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured. Please add your Supabase URL and keys to continue.')
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  const signOut = async () => {
    if (!isSupabaseConfigured) {
      setUser(null)
      navigate('/')
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
