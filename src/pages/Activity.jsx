import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

function formatNotification(n) {
  // Task-related activities
  if (n.action === 'task_created') {
    return n.description
  }
  if (n.action === 'task_moved') {
    return n.description
  }
  if (n.action === 'task_deleted') {
    return n.description
  }
  if (n.action === 'reminder_set') {
    return n.description
  }
  if (n.action === 'task_completed') {
    return n.description
  }
  if (n.action === 'task_updated') {
    return n.description
  }
  
  // Document activities
  if (n.action === 'document_created') {
    return n.description
  }
  if (n.action === 'document_updated') {
    return n.description
  }
  if (n.action === 'document_deleted') {
    return n.description
  }
  
  // Calendar activities
  if (n.action === 'event_created') {
    return n.description
  }
  if (n.action === 'note_added') {
    return n.description
  }
  
  // Legacy notification types
  if (n.type === 'online') {
    return `${n.user} is now online.`
  }
  if (n.type === 'mention') {
    return `${n.user} mentioned you in "${n.context}".`
  }
  if (n.type === 'message') {
    return `${n.user} sent a message: "${n.content}".`
  }
  if (n.type === 'todo') {
    return `Todo reminder: "${n.content}"`
  }
  if (n.type === 'reminder') {
    return `Reminder: ${n.content}`
  }
  if (n.type === 'file_shared') {
    return `${n.user} shared a file: ${n.content}`
  }
  if (n.type === 'conversation_started') {
    return `New conversation started with ${n.user}`
  }
  
  return n.description || n.message || 'Activity'
}

function getNotificationIcon(activity) {
  // Task activities
  if (activity.action === 'task_created') return '📝'
  if (activity.action === 'task_moved') return '↔️'
  if (activity.action === 'task_deleted') return '🗑️'
  if (activity.action === 'reminder_set') return '⏰'
  if (activity.action === 'task_completed') return '✅'
  if (activity.action === 'task_updated') return '📝'
  
  // Document activities
  if (activity.action === 'document_created') return '📄'
  if (activity.action === 'document_updated') return '📝'
  if (activity.action === 'document_deleted') return '🗑️'
  
  // Calendar activities
  if (activity.action === 'event_created') return '📅'
  if (activity.action === 'note_added') return '📓'
  
  // System activities
  if (activity.action === 'system') return '🔧'
  
  // Legacy types
  switch (activity.type) {
    case 'message':
      return '💬'
    case 'todo':
      return '✅'
    case 'reminder':
      return '⏰'
    case 'file_shared':
      return '📎'
    case 'online':
      return '🟢'
    case 'mention':
      return '@'
    case 'conversation_started':
      return '🆕'
    default:
      return '🔔'
  }
}

function getNotificationColor(activity) {
  // Task activities
  if (activity.action === 'task_created') return 'bg-blue-600'
  if (activity.action === 'task_moved') return 'bg-purple-600'
  if (activity.action === 'task_deleted') return 'bg-red-600'
  if (activity.action === 'reminder_set') return 'bg-yellow-600'
  if (activity.action === 'task_completed') return 'bg-green-600'
  if (activity.action === 'task_updated') return 'bg-blue-500'
  
  // Document activities
  if (activity.action === 'document_created') return 'bg-indigo-600'
  if (activity.action === 'document_updated') return 'bg-indigo-500'
  if (activity.action === 'document_deleted') return 'bg-red-600'
  
  // Calendar activities
  if (activity.action === 'event_created') return 'bg-green-600'
  if (activity.action === 'note_added') return 'bg-purple-500'
  
  // System activities
  if (activity.action === 'system') return 'bg-gray-600'
  
  // Legacy types
  switch (activity.type) {
    case 'message':
      return 'bg-blue-600'
    case 'todo':
      return 'bg-green-600'
    case 'reminder':
      return 'bg-yellow-600'
    case 'file_shared':
      return 'bg-purple-600'
    case 'online':
      return 'bg-green-500'
    case 'mention':
      return 'bg-red-600'
    case 'conversation_started':
      return 'bg-indigo-600'
    default:
      return 'bg-gray-600'
  }
}

export default function Activity() {
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'tasks', 'documents', 'calendar', 'reminders'

  useEffect(() => {
    const fetchAllActivities = async () => {
      if (!user?.id) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        
        // Fetch activities from database
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50)

        // Fetch upcoming reminders (optional - table may not exist)
        let remindersData = []
        let remindersError = null
        
        try {
          const result = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_sent', false)
            .gte('reminder_time', new Date().toISOString())
            .order('reminder_time', { ascending: true })
            .limit(10)
          
          remindersData = result.data
          remindersError = result.error
        } catch (error) {
          // Reminders table doesn't exist - this is okay
          console.log('📝 Reminders table not available - skipping reminders')
          remindersData = []
          remindersError = null
        }

        if (activitiesError) {
          console.error('Error fetching activities:', activitiesError)
          setActivities([])
        } else {
          setActivities(activitiesData || [])
        }

        if (remindersError && !remindersError.message?.includes('404') && remindersError.code !== '42P01') {
          console.error('Error fetching reminders:', remindersError)
          setReminders([])
        } else {
          setReminders(remindersData || [])
        }

      } catch (error) {
        console.error('Error fetching activities:', error)
        setActivities([])
        setReminders([])
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchAllActivities()
    }

    // Set up real-time subscription for activities
    const activitiesSubscription = supabase
      .channel('activities-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'activities',
        filter: `user_id=eq.${user?.id}`
      }, () => {
        fetchAllActivities()
      })
      .subscribe()

    // Set up real-time subscription for reminders (if table exists)
    let remindersSubscription = null
    try {
      remindersSubscription = supabase
        .channel('reminders-realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'reminders',
          filter: `user_id=eq.${user?.id}`
        }, () => {
          fetchAllActivities()
        })
        .subscribe()
    } catch (error) {
      console.log('📝 Reminders real-time subscription not available')
    }

    return () => {
      activitiesSubscription && supabase.removeChannel(activitiesSubscription)
      remindersSubscription && supabase.removeChannel(remindersSubscription)
    }
  }, [user])

  // Mark activity as read
  const markAsRead = async (activityId) => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_read: true })
        .eq('id', activityId)
        .eq('user_id', user.id)

      if (!error) {
        setActivities(prev => 
          prev.map(a => a.id === activityId ? { ...a, is_read: true } : a)
        )
      }
    } catch (error) {
      console.error('Error marking activity as read:', error)
    }
  }

  // Mark all activities as read
  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false)

      if (!error) {
        setActivities(prev => 
          prev.map(a => ({ ...a, is_read: true }))
        )
      }
    } catch (error) {
      console.error('Error marking all activities as read:', error)
    }
  }

  // Filter activities based on selected filter
  const filteredActivities = activities.filter(activity => {
    if (filter === 'all') return true
    if (filter === 'tasks') return activity.action?.startsWith('task_') || activity.action === 'reminder_set'
    if (filter === 'documents') return activity.action?.startsWith('document_')
    if (filter === 'calendar') return activity.action?.startsWith('event_') || activity.action?.startsWith('note_')
    if (filter === 'system') return activity.action === 'system'
    return true
  })

  // Combine activities and reminders for display
  const allItems = [
    ...reminders.map(reminder => ({
      id: `reminder-${reminder.id}`,
      type: 'reminder',
      action: 'reminder',
      description: `Reminder: ${reminder.message}`,
      created_at: reminder.reminder_time,
      is_read: false,
      isReminder: true,
      reminder
    })),
    ...filteredActivities
  ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const formatTimeAgo = (dateString) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now - date) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const unreadCount = activities.filter(a => !a.is_read).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
          <p className="text-gray-400">Track your tasks, reminders, and productivity</p>
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Mark all as read
            </button>
          )}
          <div className="text-sm text-gray-400">
            {unreadCount} unread
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { key: 'all', label: 'All', count: allItems.length },
          { key: 'tasks', label: 'Tasks', count: activities.filter(a => a.action?.startsWith('task_') || a.action === 'reminder_set').length },
          { key: 'documents', label: 'Documents', count: activities.filter(a => a.action?.startsWith('document_')).length },
          { key: 'calendar', label: 'Calendar', count: activities.filter(a => a.action?.startsWith('event_') || a.action?.startsWith('note_')).length },
          { key: 'reminders', label: 'Reminders', count: reminders.length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Reminders Section */}
      {reminders.length > 0 && filter === 'all' && (
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-xl p-4">
          <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Upcoming Reminders
          </h3>
          <div className="space-y-2">
            {reminders.slice(0, 3).map(reminder => (
              <div key={reminder.id} className="flex items-center justify-between bg-yellow-800/20 rounded-lg p-3">
                <div>
                  <p className="text-white font-medium">{reminder.message}</p>
                  <p className="text-yellow-300 text-sm">
                    {new Date(reminder.reminder_time).toLocaleString()}
                  </p>
                </div>
                <div className="text-yellow-400">⏰</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Activity Feed */}
      <div className="space-y-3">
        {allItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <div className="text-gray-400 text-lg mb-2">No activity yet</div>
            <div className="text-gray-500 text-sm">
              Start using tasks, documents, and calendar to see your activity here
            </div>
          </div>
        ) : (
          allItems.map((item) => (
            <div 
              key={item.id} 
              onClick={() => !item.is_read && !item.isReminder && markAsRead(item.id)}
              className={`bg-gray-900/40 border border-gray-800 rounded-xl p-4 hover:bg-gray-900/60 transition-colors ${
                item.isReminder ? 'border-yellow-500/30 bg-yellow-900/10' : 
                !item.is_read ? 'border-blue-500/30 bg-blue-900/10 cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${getNotificationColor(item)} flex items-center justify-center text-white font-medium flex-shrink-0`}>
                  {getNotificationIcon(item)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-sm ${!item.is_read || item.isReminder ? 'text-white font-medium' : 'text-gray-300'}`}>
                      {formatNotification(item)}
                    </div>
                    {(!item.is_read || item.isReminder) && (
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${item.isReminder ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.isReminder ? 
                      `Due: ${formatTimeAgo(item.created_at)}` :
                      formatTimeAgo(item.created_at)
                    }
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {allItems.length > 20 && (
        <div className="text-center">
          <button 
            onClick={() => {
              console.log('Load more activities')
            }}
            className="text-sm text-gray-400 hover:text-gray-300 transition-colors"
          >
            Load more activities
          </button>
        </div>
      )}
    </div>
  )
}
