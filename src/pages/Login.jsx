import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      await signIn(email, password)
      // Successful login - redirect will be handled by AuthContext
      console.log('Login successful, AuthContext will handle redirection')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Google sign in
  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app/home`
        }
      });
      
      if (error) {
        setError(error.message);
      } else {
        console.log('Google OAuth initiated, redirect will be handled by Supabase')
      }
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.')
      console.error('Google sign in error:', err)
    } finally {
      setLoading(false)
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
  <div className="max-w-md w-full space-y-8 bg-gray-800/80 rounded-2xl shadow-xl p-8 backdrop-blur">
        <button
          onClick={() => navigate('/')}
          className="mb-4 text-sm text-gray-400 hover:text-brand-600 flex items-center gap-1"
        >
          ← Back to Home
        </button>
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Sign in to CognEdge</h2>
          <p className="mt-2 text-gray-400">Remote Work Collaboration Suite</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
                placeholder="Enter your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="font-medium text-brand-600 hover:text-brand-500">
                Sign up
              </Link>
            </p>
          </div>
        </form>
        <div className="mt-6">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-gray-700 rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    </div>
  )
}
