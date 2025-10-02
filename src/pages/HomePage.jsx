import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Teams from './Teams'
import Calendar from './Calendar'
import Files from './Files'

function HomePage() {
  // Real-time Activity
  const [activities, setActivities] = useState([])
  useEffect(() => {
    let subscription
    const fetchActivities = async () => {
      const { data } = await supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(6)
      setActivities(data || [])
      subscription = supabase
        .channel('activity-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity' }, payload => {
          fetchActivities()
        })
        .subscribe()
    }
    fetchActivities()
    return () => { subscription && supabase.removeChannel(subscription) }
  }, [])

  // Real-time Quick Links (example: listen for changes in links table)
  const [quickLinks, setQuickLinks] = useState([])
  useEffect(() => {
    let subscription
    const fetchLinks = async () => {
      const { data } = await supabase.from('quick_links').select('*').limit(4)
      setQuickLinks(data || [])
      subscription = supabase
        .channel('links-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_links' }, payload => {
          fetchLinks()
        })
        .subscribe()
    }
    fetchLinks()
    return () => { subscription && supabase.removeChannel(subscription) }
  }, [])

  const [tab, setTab] = useState('Activity');

  return (
    <div className="min-h-full">
      {/* Content header tabs */}
      <div className="px-6 pt-4 border-b border-gray-800">
        <div className="flex gap-6 text-sm">
          <Tab active={tab === 'Activity'} onClick={() => setTab('Activity')}>Activity</Tab>
          {/* <Tab active={tab === 'Chat'} onClick={() => setTab('Chat')}>Chat</Tab>
          <Tab active={tab === 'Teams'} onClick={() => setTab('Teams')}>Teams</Tab>
          <Tab active={tab === 'Calendar'} onClick={() => setTab('Calendar')}>Calendar</Tab>
          <Tab active={tab === 'Files'} onClick={() => setTab('Files')}>Files</Tab> */}
        </div>
      </div>

      {/* Dashboard content placeholder */}
      <div className="p-6 grid grid-cols-12 gap-6">
        {tab === 'Activity' && (
          <>
            <Card className="col-span-12 lg:col-span-8" title="Recent Activity">
              <form className="mb-3 flex gap-2" onSubmit={async e => {
                e.preventDefault();
                const form = e.target;
                const message = form.activity.value.trim();
                if (!message) return;
                await supabase.from('activity').insert({ message });
                form.reset();
              }}>
                <input name="activity" className="bg-gray-800 rounded px-2 py-1 text-sm flex-1" placeholder="Add activity..." />
                <button className="bg-brand-600 hover:bg-brand-700 rounded px-3 py-1 text-sm text-white">Add</button>
              </form>
              <ul className="space-y-3 text-sm">
                {activities.length === 0 ? (
                  <li className="text-gray-400">No activity yet.</li>
                ) : (
                  activities.map((activity) => (
                    <li key={activity.id} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-brand-600" />
                      <span className="text-gray-300">{activity.message}</span>
                    </li>
                  ))
                )}
              </ul>
            </Card>
          </>
        )}


        {tab === 'Teams' && (
          <div className="col-span-12">
            <Teams />
          </div>
        )}

        {tab === 'Calendar' && (
          <div className="col-span-12">
            <Calendar />
          </div>
        )}

        {tab === 'Files' && (
          <div className="col-span-12">
            <Files />
          </div>
        )}

        {/* Quick Links always visible */}
        <Card className="col-span-12 lg:col-span-6" title="Quick Links">
          <form className="mb-3 flex gap-2" onSubmit={async e => {
            e.preventDefault();
            const form = e.target;
            const name = form.linkname.value.trim();
            const url = form.linkurl.value.trim();
            if (!name || !url) return;
            await supabase.from('quick_links').insert({ name, url });
            form.reset();
          }}>
            <input name="linkname" className="bg-gray-800 rounded px-2 py-1 text-sm flex-1" placeholder="Link name..." />
            <input name="linkurl" className="bg-gray-800 rounded px-2 py-1 text-sm flex-1" placeholder="Link URL..." />
            <button className="bg-brand-600 hover:bg-brand-700 rounded px-3 py-1 text-sm text-white">Add</button>
          </form>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {quickLinks.length === 0 ? (
              <div className="text-gray-400">No quick links.</div>
            ) : (
              quickLinks.map((link) => (
                <a key={link.id} className="bg-gray-800/60 hover:bg-gray-700/70 rounded-md p-4 text-center" href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.name}
                </a>
              ))
            )}
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
        <button className="text-xs text-gray-400 hover:text-gray-200">•••</button>
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

export default HomePage
