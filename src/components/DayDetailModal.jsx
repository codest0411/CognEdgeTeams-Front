import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function DayDetailModal({ open, onClose, date, events, tasks, notes, onRefresh }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('events');
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_time: '' });
  const [newNote, setNewNote] = useState({ content: '', mood: 'okay', tags: [] });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open) {
      setActiveTab('events');
      setNewTask({ title: '', priority: 'medium', due_time: '' });
      
      // Initialize note form with existing note data if available
      const formatDateString = (date) => {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      
      const dateStr = date ? formatDateString(date) : null;
      const existingNote = dateStr ? notes.find(n => n.date === dateStr) : null;
      
      console.log('Modal opened for date:', dateStr);
      console.log('Existing note found:', existingNote);
      console.log('All notes:', notes);
      
      if (existingNote) {
        console.log('Loading existing note into form');
        setNewNote({
          content: existingNote.content,
          mood: existingNote.mood,
          tags: existingNote.tags || []
        });
      } else {
        console.log('No existing note, creating new form');
        setNewNote({ content: '', mood: 'okay', tags: [] });
      }
      
      setTagInput('');
    }
  }, [open, date, notes]);

  if (!open || !date) return null;

  // Format date consistently (avoid timezone issues)
  const formatDateString = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const dateStr = formatDateString(date);
  console.log('DayDetailModal - Date object:', date, 'Formatted string:', dateStr);
  
  const dayEvents = events.filter(e => e.date === dateStr);
  const dayTasks = tasks.filter(t => t.date === dateStr);
  const dayNote = notes.find(n => n.date === dateStr);
  
  console.log('Filtered data for', dateStr, '- Events:', dayEvents.length, 'Tasks:', dayTasks.length, 'Note:', !!dayNote);

  const handleAddTask = async () => {
    if (!newTask.title.trim() || !user) return;

    const { data, error } = await supabase
      .from('calendar_tasks')
      .insert({
        ...newTask,
        user_id: user.id,
        date: dateStr
      })
      .select();

    if (data && !error) {
      setNewTask({ title: '', priority: 'medium', due_time: '' });
      onRefresh();
    }
  };

  const handleToggleTask = async (taskId, isCompleted) => {
    const { error } = await supabase
      .from('calendar_tasks')
      .update({ 
        is_completed: !isCompleted,
        completed_at: !isCompleted ? new Date().toISOString() : null
      })
      .eq('id', taskId);

    if (!error) {
      onRefresh();
    }
  };

  const handleDeleteTask = async (taskId) => {
    const { error } = await supabase
      .from('calendar_tasks')
      .delete()
      .eq('id', taskId);

    if (!error) {
      onRefresh();
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.content.trim() || !user) {
      console.log('Cannot save note - missing content or user');
      alert('Please enter some content for the note');
      return;
    }

    const noteData = {
      user_id: user.id,
      date: dateStr,
      content: newNote.content.trim(),
      mood: newNote.mood,
      tags: newNote.tags || []
    };

    console.log('Saving note:', noteData);

    try {
      if (dayNote) {
        // Update existing note
        console.log('Updating existing note with ID:', dayNote.id);
        const { data, error } = await supabase
          .from('calendar_notes')
          .update(noteData)
          .eq('id', dayNote.id)
          .select();

        if (error) {
          console.error('Error updating note:', error);
          alert('Failed to update note: ' + error.message);
          return;
        }

        console.log('Note updated successfully:', data);
      } else {
        // Create new note
        console.log('Creating new note');
        const { data, error } = await supabase
          .from('calendar_notes')
          .insert(noteData)
          .select();

        if (error) {
          console.error('Error creating note:', error);
          alert('Failed to save note: ' + error.message);
          return;
        }

        console.log('Note created successfully:', data);
      }

      // Reset form and refresh
      setNewNote({ content: '', mood: 'okay', tags: [] });
      onRefresh();
      alert('Note saved successfully!');

    } catch (error) {
      console.error('Unexpected error saving note:', error);
      alert('Failed to save note. Please try again.');
    }
  };

  const handleDeleteNote = async () => {
    if (!dayNote) return;

    const { error } = await supabase
      .from('calendar_notes')
      .delete()
      .eq('id', dayNote.id);

    if (!error) {
      onRefresh();
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !newNote.tags.includes(tagInput.trim())) {
      setNewNote(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setNewNote(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getMoodEmoji = (mood) => {
    const moods = {
      great: '😄',
      good: '😊',
      okay: '😐',
      bad: '😞',
      terrible: '😢'
    };
    return moods[mood] || '😐';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-gray-400',
      medium: 'text-blue-400',
      high: 'text-yellow-400',
      urgent: 'text-red-400'
    };
    return colors[priority] || 'text-blue-400';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#202c33] rounded-xl shadow-2xl w-[600px] max-h-[80vh] overflow-hidden border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">
              {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {dayEvents.length} events • {dayTasks.length} tasks • {dayNote ? '1 note' : 'No notes'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          {[
            { id: 'events', label: 'Events', count: dayEvents.length },
            { id: 'tasks', label: 'Tasks', count: dayTasks.length },
            { id: 'notes', label: 'Notes', count: dayNote ? 1 : 0 }
          ].map(tab => (
            <button
              key={tab.id}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-brand-400 border-b-2 border-brand-400 bg-brand-900/20'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[400px] overflow-y-auto">
          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              {dayEvents.length > 0 ? (
                dayEvents.map(event => (
                  <div 
                    key={event.id} 
                    className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: event.color }}
                          ></div>
                          <h3 className="font-medium text-white">{event.title}</h3>
                          <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 capitalize">
                            {event.event_type}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {event.start_time && (
                            <span>🕐 {event.start_time} - {event.end_time || 'No end time'}</span>
                          )}
                          {event.location && <span>📍 {event.location}</span>}
                          {event.is_all_day && <span>📅 All day</span>}
                        </div>
                        {event.notes && (
                          <p className="text-sm text-gray-400 mt-2 italic">{event.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No events for this day</p>
                  <p className="text-sm mt-1">Click "Add Event" to create one</p>
                </div>
              )}
            </div>
          )}

          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              {/* Add Task Form */}
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <h3 className="text-sm font-medium text-white mb-3">Add New Task</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Task title..."
                    className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
                    value={newTask.title}
                    onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <select
                      className="bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
                      value={newTask.priority}
                      onChange={e => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="urgent">Urgent</option>
                    </select>
                    <input
                      type="time"
                      className="bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
                      value={newTask.due_time}
                      onChange={e => setNewTask(prev => ({ ...prev, due_time: e.target.value }))}
                    />
                    <button
                      onClick={handleAddTask}
                      className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Tasks List */}
              {dayTasks.length > 0 ? (
                <div className="space-y-2">
                  {dayTasks.map(task => (
                    <div 
                      key={task.id}
                      className={`p-3 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center gap-3 ${
                        task.is_completed ? 'opacity-60' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={task.is_completed}
                        onChange={() => handleToggleTask(task.id, task.is_completed)}
                        className="w-4 h-4 text-brand-600 bg-gray-800 border-gray-600 rounded focus:ring-brand-500"
                      />
                      <div className="flex-1">
                        <div className={`font-medium ${task.is_completed ? 'line-through text-gray-500' : 'text-white'}`}>
                          {task.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className={getPriorityColor(task.priority)}>{task.priority}</span>
                          {task.due_time && <span>🕐 {task.due_time}</span>}
                          {task.is_completed && task.completed_at && (
                            <span>✅ {new Date(task.completed_at).toLocaleTimeString()}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No tasks for this day</p>
                  <p className="text-sm mt-1">Add a task above to get started</p>
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Note Editor */}
              <div className="p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <h3 className="text-sm font-medium text-white mb-3">
                  {dayNote ? 'Edit Note' : 'Add Note'}
                </h3>
                <div className="space-y-3">
                  <textarea
                    placeholder="Write your thoughts for this day..."
                    className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none resize-none"
                    rows={4}
                    value={newNote.content}
                    onChange={e => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  />
                  
                  {/* Mood Selector */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Mood</label>
                    <div className="flex gap-2">
                      {['great', 'good', 'okay', 'bad', 'terrible'].map(mood => (
                        <button
                          key={mood}
                          type="button"
                          className={`px-3 py-2 rounded-md text-sm transition-colors ${
                            newNote.mood === mood
                              ? 'bg-brand-600 text-white'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                          onClick={() => setNewNote(prev => ({ ...prev, mood }))}
                        >
                          {getMoodEmoji(mood)} {mood}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">Tags</label>
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {newNote.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-brand-600 text-white text-xs rounded-full flex items-center gap-1"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="text-white hover:text-gray-300"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add tag..."
                        className="flex-1 bg-gray-800 rounded-md px-3 py-1 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
                        value={tagInput}
                        onChange={e => setTagInput(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && addTag()}
                      />
                      <button
                        onClick={addTag}
                        className="px-3 py-1 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    {dayNote && (
                      <button
                        onClick={handleDeleteNote}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Delete Note
                      </button>
                    )}
                    <button
                      onClick={() => {
                        console.log('Save button clicked');
                        console.log('Current note state:', newNote);
                        console.log('User:', user?.id);
                        console.log('Date string:', dateStr);
                        handleSaveNote();
                      }}
                      className="px-4 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors"
                      disabled={!newNote.content.trim()}
                    >
                      {dayNote ? 'Update Note' : 'Save Note'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Note Display */}
              {dayNote && (
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getMoodEmoji(dayNote.mood)}</span>
                      <span className="text-sm text-gray-400 capitalize">{dayNote.mood} mood</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(dayNote.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-white mb-2">{dayNote.content}</p>
                  {dayNote.tags && dayNote.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {dayNote.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
