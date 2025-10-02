import { useState, useEffect } from 'react';

export default function AddEventModal({ open, onClose, onAdd, date }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    event_type: 'personal',
    priority: 'medium',
    color: '#3b82f6',
    is_all_day: false,
    reminder_minutes: 15,
    location: '',
    notes: ''
  });
  
  const [selectedDate, setSelectedDate] = useState(date);

  useEffect(() => {
    if (!open) {
      setFormData({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        event_type: 'personal',
        priority: 'medium',
        color: '#3b82f6',
        is_all_day: false,
        reminder_minutes: 15,
        location: '',
        notes: ''
      });
    }
    setSelectedDate(date);
  }, [open, date]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !selectedDate) return;
    onAdd(formData, selectedDate);
  };

  const eventTypeColors = {
    personal: '#3b82f6',
    work: '#ef4444',
    meeting: '#f59e0b',
    reminder: '#10b981',
    birthday: '#ec4899',
    holiday: '#8b5cf6'
  };

  const handleEventTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      event_type: type,
      color: eventTypeColors[type]
    }));
  };

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[#202c33] rounded-xl shadow-2xl p-6 w-96 max-h-[90vh] overflow-y-auto border border-gray-800">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Add Event</h2>
            <button 
              type="button" 
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Event Date *
            </label>
            <input
              type="date"
              className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
              value={selectedDate ? 
                `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` 
                : ''}
              onChange={e => {
                if (e.target.value) {
                  const [year, month, day] = e.target.value.split('-');
                  const newDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  console.log('Date picker changed to:', e.target.value, 'Created date:', newDate);
                  setSelectedDate(newDate);
                }
              }}
              required
            />
            <div className="text-xs text-gray-400 mt-1">
              📅 {selectedDate?.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
            
            {/* Quick Date Selection */}
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                onClick={() => {
                  const today = new Date();
                  console.log('Setting to today:', today);
                  setSelectedDate(today);
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                onClick={() => {
                  const today = new Date();
                  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
                  console.log('Setting to tomorrow:', tomorrow);
                  setSelectedDate(tomorrow);
                }}
              >
                Tomorrow
              </button>
              <button
                type="button"
                className="px-2 py-1 bg-gray-700 text-white rounded text-xs hover:bg-gray-600"
                onClick={() => {
                  const today = new Date();
                  const nextWeek = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);
                  console.log('Setting to next week:', nextWeek);
                  setSelectedDate(nextWeek);
                }}
              >
                Next Week
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Event Title *
            </label>
            <input
              type="text"
              className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
              placeholder="Enter event title..."
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              autoFocus
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none resize-none"
              placeholder="Event description..."
              rows={2}
              value={formData.description}
              onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Event Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(eventTypeColors).map(([type, color]) => (
                <button
                  key={type}
                  type="button"
                  className={`px-3 py-2 rounded-md text-xs font-medium capitalize transition-colors ${
                    formData.event_type === type
                      ? 'text-white'
                      : 'text-gray-300 bg-gray-800 hover:bg-gray-700'
                  }`}
                  style={formData.event_type === type ? { backgroundColor: color } : {}}
                  onClick={() => handleEventTypeChange(type)}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="all-day"
              className="w-4 h-4 text-brand-600 bg-gray-800 border-gray-600 rounded focus:ring-brand-500"
              checked={formData.is_all_day}
              onChange={e => setFormData(prev => ({ ...prev, is_all_day: e.target.checked }))}
            />
            <label htmlFor="all-day" className="text-sm text-gray-300">
              All day event
            </label>
          </div>

          {/* Time Fields */}
          {!formData.is_all_day && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
                  value={formData.start_time}
                  onChange={e => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
                  value={formData.end_time}
                  onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['low', 'medium', 'high', 'urgent'].map(priority => (
                <button
                  key={priority}
                  type="button"
                  className={`px-3 py-2 rounded-md text-xs font-medium capitalize ${
                    formData.priority === priority
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, priority }))}
                >
                  {priority}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
              placeholder="Event location..."
              value={formData.location}
              onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          {/* Reminder */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Reminder
            </label>
            <select
              className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none"
              value={formData.reminder_minutes}
              onChange={e => setFormData(prev => ({ ...prev, reminder_minutes: parseInt(e.target.value) }))}
            >
              <option value={0}>No reminder</option>
              <option value={5}>5 minutes before</option>
              <option value={15}>15 minutes before</option>
              <option value={30}>30 minutes before</option>
              <option value={60}>1 hour before</option>
              <option value={1440}>1 day before</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              className="w-full bg-gray-800 rounded-md px-3 py-2 text-sm text-white border border-gray-700 focus:border-brand-500 focus:outline-none resize-none"
              placeholder="Additional notes..."
              rows={2}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <button 
              type="button"
              className="px-4 py-2 rounded-md bg-gray-700 text-white hover:bg-gray-600 transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 rounded-md bg-brand-600 text-white hover:bg-brand-700 transition-colors"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  ) : null;
}
