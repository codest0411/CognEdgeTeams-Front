import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Topbar() {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const sidebarRoutes = {
    Activity: '/app/activity',
    Chat: '/app/chat',
    Teams: '/app/teams',
    Calendar: '/app/calendar',
    Files: '/app/files',
    Tasks: '/app/tasks',
    Docs: '/app/docs',
    Whiteboard: '/app/whiteboard',
    About: '/app/about',
  }
  const sidebarNames = Object.keys(sidebarRoutes)

  const handleSearch = (e) => {
    const value = e.target.value
    setSearch(value)
    if (value.trim() === '') {
      setResults([])
    } else {
      setResults(sidebarNames.filter(name => name.toLowerCase().includes(value.toLowerCase())))
    }
  }

  const handleResultClick = (name) => {
    const route = sidebarRoutes[name]
    if (route) {
      navigate(route)
      setSearch('')
      setResults([])
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="text-lg font-semibold">CognEdgeTeams</div>
        <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
          <span>Remote Work Collaboration Suite</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:block relative">
          <input
            type="search"
            placeholder="Search"
            value={search}
            onChange={handleSearch}
            className="bg-gray-800 text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-700 placeholder:text-gray-500"
          />
          {results.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50">
              <ul className="py-1 text-sm">
                {results.map((name) => (
                  <li
                    key={name}
                    className="px-4 py-2 hover:bg-gray-800 text-gray-200 cursor-pointer"
                    onClick={() => handleResultClick(name)}
                  >
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 hover:bg-gray-800 rounded-md p-1"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-700 to-brand-600 flex items-center justify-center text-white text-sm font-medium">
              {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            <span className="absolute -bottom-0 -right-0 block w-3 h-3 bg-green-500 rounded-full ring-2 ring-gray-900" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-gray-800 border border-gray-700 rounded-md shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-700">
                <div className="text-sm font-medium text-white">
                  {user?.user_metadata?.full_name || 'User'}
                </div>
                <div className="text-xs text-gray-400">{user?.email}</div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
