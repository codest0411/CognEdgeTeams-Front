
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import AddEventModal from '../components/AddEventModal';
import DayDetailModal from '../components/DayDetailModal';

export default function Calendar() {
  const { user } = useAuth();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const [events, setEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'

  // Utility function to format date consistently
  const formatDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (!user) {
      // Clear all data when user is not logged in
      setEvents([]);
      setTasks([]);
      setNotes([]);
      return;
    }
    
    let eventsSubscription, tasksSubscription, notesSubscription;
    
    const fetchCalendarData = async () => {
      const start = new Date(year, month, 1).toISOString().slice(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      
      console.log('Fetching calendar data for user:', user.id, 'from', start, 'to', end);
      
      // Fetch events
      const { data: eventsData, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('calendar_tasks')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from('calendar_notes')
        .select('*')
        .gte('date', start)
        .lte('date', end)
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      // Log any errors
      if (eventsError) console.error('Events fetch error:', eventsError);
      if (tasksError) console.error('Tasks fetch error:', tasksError);
      if (notesError) console.error('Notes fetch error:', notesError);
      
      // Log fetched data
      console.log('Fetched events:', eventsData?.length || 0, eventsData);
      console.log('Fetched tasks:', tasksData?.length || 0, tasksData);
      console.log('Fetched notes:', notesData?.length || 0, notesData);
      
      // Only set real data, ensure arrays are empty if no data
      setEvents(eventsData || []);
      setTasks(tasksData || []);
      setNotes(notesData || []);
    };

    fetchCalendarData();

    // Set up real-time subscriptions
    eventsSubscription = supabase
      .channel('calendar-events-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'calendar_events',
        filter: `user_id=eq.${user.id}`
      }, () => fetchCalendarData())
      .subscribe();

    tasksSubscription = supabase
      .channel('calendar-tasks-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'calendar_tasks',
        filter: `user_id=eq.${user.id}`
      }, () => fetchCalendarData())
      .subscribe();

    notesSubscription = supabase
      .channel('calendar-notes-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'calendar_notes',
        filter: `user_id=eq.${user.id}`
      }, () => fetchCalendarData())
      .subscribe();

    return () => {
      if (eventsSubscription) supabase.removeChannel(eventsSubscription);
      if (tasksSubscription) supabase.removeChannel(tasksSubscription);
      if (notesSubscription) supabase.removeChannel(notesSubscription);
    };
  }, [month, year, user]);

  const handleDayClick = (day) => {
    if (!day) return;
    const date = new Date(year, month, day);
    console.log('Day clicked:', day, 'Month:', month, 'Year:', year, 'Date created:', date);
    console.log('Date string:', `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    setSelectedDate(date);
    setDayDetailOpen(true);
  };

  const handleAddEvent = async (eventData, eventDate) => {
    if (!eventData.title || !eventDate || !user) return;
    
    // Use the date from the modal (eventDate) instead of selectedDate
    const targetDate = eventDate || selectedDate;
    const dateStr = formatDateString(targetDate);
    
    console.log('Adding event:', eventData.title);
    console.log('Target date object:', targetDate);
    console.log('Formatted date string:', dateStr);
    console.log('Date breakdown - Year:', targetDate.getFullYear(), 'Month:', targetDate.getMonth() + 1, 'Day:', targetDate.getDate());
    
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({ 
        ...eventData,
        user_id: user.id,
        date: dateStr 
      })
      .select();
    
    if (data && data.length > 0) {
      setEvents(prev => [...prev, ...data]);
      console.log('Event added successfully to database:', data[0]);
    }
    
    if (error) {
      console.error('Error adding event:', error);
    }
    
    setModalOpen(false);
    setSelectedDate(null);
  };

  const handlePrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };
  
  const handleToday = () => {
    const now = new Date();
    setMonth(now.getMonth());
    setYear(now.getFullYear());
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL your calendar data? This cannot be undone!')) {
      return;
    }

    try {
      // Delete all user's calendar data
      await Promise.all([
        supabase.from('calendar_events').delete().eq('user_id', user.id),
        supabase.from('calendar_tasks').delete().eq('user_id', user.id),
        supabase.from('calendar_notes').delete().eq('user_id', user.id)
      ]);

      // Clear local state
      setEvents([]);
      setTasks([]);
      setNotes([]);
      
      console.log('All calendar data cleared for user:', user.id);
      alert('All calendar data has been cleared!');
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data: ' + error.message);
    }
  };

  const getEventTypeColor = (eventType) => {
    const colors = {
      personal: '#3b82f6',
      work: '#ef4444',
      meeting: '#f59e0b',
      reminder: '#10b981',
      birthday: '#ec4899',
      holiday: '#8b5cf6'
    };
    return colors[eventType] || '#3b82f6';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#6b7280',
      medium: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    };
    return colors[priority] || '#3b82f6';
  };

  // Calculate days for the current month
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);
  while (calendarDays.length % 7 !== 0) calendarDays.push(null);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">My Calendar</h1>
          <div className="text-sm text-gray-400">
            Events: {events.length} | Tasks: {tasks.length} | Notes: {notes.length}
          </div>
          <div className="flex gap-2">
            <button 
              className={`px-3 py-1 rounded-md text-sm ${viewMode === 'month' ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
            <button 
              className={`px-3 py-1 rounded-md text-sm ${viewMode === 'week' ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            className="bg-brand-600 hover:bg-brand-700 rounded-md px-4 py-2 text-sm font-medium text-white"
            onClick={() => {
              const today = new Date();
              setSelectedDate(today);
              setModalOpen(true);
            }}
          >
            + Add Event
          </button>
          <button 
            className="bg-gray-800 hover:bg-gray-700 rounded-md px-3 py-2 text-sm"
            onClick={handleToday}
          >
            Today
          </button>
          <button 
            className="bg-red-600 hover:bg-red-700 rounded-md px-3 py-2 text-sm text-white"
            onClick={clearAllData}
            title="Clear all calendar data (for testing)"
          >
            🗑️ Clear All
          </button>
          <button 
            className="bg-gray-800 hover:bg-gray-700 rounded-md px-3 py-2 text-sm" 
            onClick={handlePrevMonth}
          >
            ←
          </button>
          <span className="text-white px-4 font-semibold min-w-[200px] text-center">
            {new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            className="bg-gray-800 hover:bg-gray-700 rounded-md px-3 py-2 text-sm" 
            onClick={handleNextMonth}
          >
            →
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-900/40 rounded-lg border border-gray-800 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-800/50">
          {days.map((d) => (
            <div key={d} className="p-3 text-center text-sm font-medium text-gray-300 border-r border-gray-700 last:border-r-0">
              {d}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => {
            const isToday = day && 
              new Date().getDate() === day && 
              new Date().getMonth() === month && 
              new Date().getFullYear() === year;
            
            const dayEvents = day ? events.filter(e => {
              const [yyyy, mm, dd] = e.date.split('-');
              const edate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
              return edate.getDate() === day && edate.getMonth() === month && edate.getFullYear() === year;
            }).sort((a, b) => (a.start_time || '00:00').localeCompare(b.start_time || '00:00')) : [];
            
            const dayTasks = day ? tasks.filter(t => {
              const [yyyy, mm, dd] = t.date.split('-');
              const tdate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
              return tdate.getDate() === day && tdate.getMonth() === month && tdate.getFullYear() === year;
            }) : [];
            
            const dayNote = day ? notes.find(n => {
              const [yyyy, mm, dd] = n.date.split('-');
              const ndate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
              return ndate.getDate() === day && ndate.getMonth() === month && ndate.getFullYear() === year;
            }) : null;

            return (
              <div
                key={i}
                className={`min-h-[120px] border-r border-b border-gray-700 last:border-r-0 p-2 ${
                  day 
                    ? `cursor-pointer hover:bg-gray-800/30 ${isToday ? 'bg-brand-900/20' : 'bg-gray-900/20'}` 
                    : 'opacity-30 pointer-events-none bg-gray-900/10'
                }`}
                onClick={() => day && handleDayClick(day)}
                onDoubleClick={() => {
                  if (day) {
                    const date = new Date(year, month, day);
                    console.log('Double-click - Day:', day, 'Month:', month, 'Year:', year, 'Date created:', date);
                    setSelectedDate(date);
                    setModalOpen(true);
                  }
                }}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday 
                    ? 'text-brand-400 bg-brand-600 w-6 h-6 rounded-full flex items-center justify-center' 
                    : day 
                      ? 'text-gray-300' 
                      : 'text-gray-600'
                }`}>
                  {day || ''}
                </div>
                
                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map(event => (
                    <div 
                      key={event.id} 
                      className="text-xs px-2 py-1 rounded text-white truncate"
                      style={{ backgroundColor: event.color || getEventTypeColor(event.event_type) }}
                      title={`${event.title}${event.start_time ? ` at ${event.start_time}` : ''}`}
                    >
                      {event.start_time && <span className="opacity-75">{event.start_time.slice(0, 5)} </span>}
                      {event.title}
                    </div>
                  ))}
                  
                  {/* Tasks indicator */}
                  {dayTasks.length > 0 && (
                    <div className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                      {dayTasks.length} task{dayTasks.length > 1 ? 's' : ''}
                    </div>
                  )}
                  
                  {/* Note indicator */}
                  {dayNote && (
                    <div className="text-xs text-purple-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                      Note
                    </div>
                  )}
                  
                  {/* More events indicator */}
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-400">
                      +{dayEvents.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <AddEventModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onAdd={handleAddEvent} 
        date={selectedDate} 
      />
      
      <DayDetailModal
        open={dayDetailOpen}
        onClose={() => setDayDetailOpen(false)}
        date={selectedDate}
        events={events}
        tasks={tasks}
        notes={notes}
        onRefresh={() => {
          // Refresh data after changes
          if (user) {
            const start = new Date(year, month, 1).toISOString().slice(0, 10);
            const end = new Date(year, month + 1, 0).toISOString().slice(0, 10);
            
            Promise.all([
              supabase.from('calendar_events').select('*').gte('date', start).lte('date', end).eq('user_id', user.id),
              supabase.from('calendar_tasks').select('*').gte('date', start).lte('date', end).eq('user_id', user.id),
              supabase.from('calendar_notes').select('*').gte('date', start).lte('date', end).eq('user_id', user.id)
            ]).then(([eventsRes, tasksRes, notesRes]) => {
              setEvents(eventsRes.data || []);
              setTasks(tasksRes.data || []);
              setNotes(notesRes.data || []);
            });
          }
        }}
      />
    </div>
  );
}
