import React from 'react'

function AboutProject() {
  return (
    <div className="min-h-full">
      <div className="px-6 pt-4 border-b border-gray-800">
        <div className="flex gap-6 text-sm">
          <Tab>Activity</Tab>
          <Tab>Chat</Tab>
          <Tab>Teams</Tab>
          <Tab>Calendar</Tab>
          <Tab>Files</Tab>
        </div>
      </div>
      <div className="p-6 grid grid-cols-12 gap-6">
        <Card className="col-span-12" title="About This Project">
          <div className="space-y-4 text-gray-300 text-base">
            <p><strong>Project Name:</strong> CognEdge Real-Time Dashboard</p>
            <p><strong>How it works:</strong> This dashboard uses Supabase for real-time updates, authentication, and storage. All activities, meetings, chats, and quick links update instantly for all users. The backend is Node.js, and the frontend is built with React and Tailwind CSS for a modern UI.</p>
            <p><strong>Main Features:</strong></p>
            <ul className="list-disc ml-6">
              <li>Real-time activity feed</li>
              <li>Instant chat and messaging</li>
              <li>Teams and collaboration tools</li>
              <li>Calendar and meeting scheduling</li>
              <li>File sharing and management</li>
              <li>Task tracking</li>
              <li>Document management</li>
              <li>Whiteboard for brainstorming</li>
              <li>Quick links for productivity</li>
              <li>Google OAuth login</li>
              <li>Role-based access and security</li>
              <li>Modern sidebar with SVG icons and glow effects</li>
              <li>Responsive design for desktop and mobile</li>
            </ul>
            <p><strong>Tech Stack:</strong> Supabase, Node.js, React, Tailwind CSS</p>
            <p><strong>Usage:</strong> Navigate using the sidebar. All sections update in real-time. Use the chat for instant messaging, schedule meetings, and manage files and tasks easily.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-gray-900/40 border border-gray-800 rounded-xl p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function Tab({ active = false, children }) {
  return (
    <button
      className={`pb-3 -mb-px border-b-2 text-sm transition ${
        active ? 'border-brand-600 text-white' : 'border-transparent text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export default AboutProject
