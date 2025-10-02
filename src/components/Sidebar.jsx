

import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const icons = {
  Home: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5L11 4l8 6.5"/><rect x="5" y="11" width="12" height="7" rx="2"/></svg>,
  Activity: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="9"/><path d="M11 6v5l3 3"/></svg>,
  Chat: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Meetings: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="18" height="11" rx="2" ry="2"/><polyline points="22,8.5 12,13.5 2,8.5"/><path d="M7 3 L7 7"/><path d="M15 3 L15 7"/></svg>,
  Teams: <svg width="22" height="22" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="7" r="3.5" /><circle cx="5.5" cy="10.5" r="2.5" /><circle cx="16.5" cy="10.5" r="2.5" /><path d="M2 17c0-2.5 3-4.5 9-4.5s9 2 9 4.5v2H2v-2z" /></svg>,
  Calendar: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="16" height="14" rx="3"/><path d="M8 2v4M14 2v4M3 10h16"/></svg>,
  Files: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="14" height="14" rx="3"/><path d="M4 8h14"/></svg>,
  Tasks: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="16" height="16" rx="3"/><path d="M7 7h8M7 15h8"/></svg>,
  Docs: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="14" height="14" rx="3"/><path d="M8 4v14M14 4v14"/></svg>,
  Documents: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10,9 9,9 8,9"/></svg>,
  Whiteboard: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="18" height="10" rx="3"/><path d="M6 10h10M6 14h10"/></svg>,
  Help: <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="9"/><path d="M11 15v-4"/><path d="M11 8h.01"/></svg>
}

const items = [
  { to: '/app/home', label: 'Home', icon: icons.Home },
  { to: '/app/activity', label: 'Activity', icon: icons.Activity },
  { to: '/app/chat', label: 'Chat', icon: icons.Chat },
  { to: '/app/meetings', label: 'Meetings', icon: icons.Meetings },
  { to: '/app/teams', label: 'Teams', icon: icons.Teams },
  { to: '/app/calendar', label: 'Calendar', icon: icons.Calendar },
  { to: '/app/files', label: 'Files', icon: icons.Files },
  { to: '/app/tasks', label: 'Tasks', icon: icons.Tasks },
  { to: '/app/documents', label: 'Documents', icon: icons.Documents },
  { to: '/app/whiteboard', label: 'Whiteboard', icon: icons.Whiteboard },
]

function Logo() {
  return (
    <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-brand-700 to-brand-600 mb-1 shadow-lg">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="24" height="24" rx="6" fill="#6366F1" />
        <path d="M8 14h12M14 8v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default function Sidebar() {
  const [open, setOpen] = useState(false)
  return (
    <div className={`transition-all duration-300 ${open ? 'w-48' : 'w-16'} bg-black/40 border-r border-gray-800 flex flex-col items-center py-3 gap-2`}>
      <button
        className="w-10 h-10 rounded-lg flex flex-col items-center justify-center hover:bg-gray-800 mb-2"
        title={open ? 'Close sidebar' : 'Open sidebar'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="block w-6 h-0.5 bg-gray-300 rounded mb-1" />
        <span className="block w-6 h-0.5 bg-gray-300 rounded mb-1" />
        <span className="block w-6 h-0.5 bg-gray-300 rounded" />
      </button>
      <div className="h-px w-8 bg-gray-800 my-1" />
      <nav className="flex-1 flex flex-col items-center gap-2 w-full">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-gray-800 ${
                isActive
                  ? 'bg-gradient-to-br from-brand-600 to-brand-400 text-white drop-shadow-[0_0_8px_rgba(99,102,241,0.7)]'
                  : 'text-gray-300'
              }`
            }
            title={it.label}
          >
            <span className="w-7 h-7 flex items-center justify-center">{it.icon}</span>
            {open && <span className="font-medium text-sm">{it.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="h-px w-8 bg-gray-800 my-1" />
      <NavLink to="/app/about" className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-gray-800" title="About">
        {icons.Help}
      </NavLink>
    </div>
  )
}
