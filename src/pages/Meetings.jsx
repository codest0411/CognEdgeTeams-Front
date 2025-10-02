import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaVideo, FaCalendarPlus, FaLink, FaUser, FaClock,
  FaHistory, FaPlay, FaDownload, FaCopy, FaCheck,
  FaLock, FaTimes, FaUsers, FaCalendar, FaPlus
} from 'react-icons/fa'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * Meetings Dashboard
 * - New Meeting
 * - Schedule Meeting
 * - Join Meeting
 * - Personal Room
 * - Upcoming Meetings
 * - Past Meetings & Recordings
 */
const Meetings = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [upcomingMeetings, setUpcomingMeetings] = useState([])
  const [pastMeetings, setPastMeetings] = useState([])
  const [personalRoom, setPersonalRoom] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadMeetings()
    loadPersonalRoom()
  }, [])

  const loadMeetings = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/meetings/user/meetings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        const upcoming = data.meetings?.filter(m => m.meeting_status === 'scheduled') || []
        const past = data.meetings?.filter(m => m.meeting_status === 'ended') || []
        setUpcomingMeetings(upcoming)
        setPastMeetings(past)
      }
    } catch (error) {
      console.error('Error loading meetings:', error)
    }
  }

  const loadPersonalRoom = async () => {
    // TODO: Implement personal room API
    setPersonalRoom({
      room_id: 'PR-USER12345',
      room_link: `${window.location.origin}/meet/PR-USER12345`
    })
  }

  const createInstantMeeting = async (options = {}) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: options.title || 'Instant Meeting',
          description: options.description || '',
          password: options.password || null,
          max_participants: options.maxParticipants || 100,
          ...options
        })
      })

      if (!response.ok) throw new Error('Failed to create meeting')

      const data = await response.json()
      const meetingId = data.meeting.meeting_id
      const meetingLink = `${window.location.origin}/meet/${meetingId}`
      
      // Send email invitations if provided
      if (options.inviteEmails && options.inviteEmails.length > 0) {
        try {
          await fetch(`${API_URL}/api/meetings/${meetingId}/invite`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              emails: options.inviteEmails,
              meetingLink,
              password: options.password
            })
          })
          alert(`Meeting created! Invitations sent to ${options.inviteEmails.length} email(s)`)
        } catch (emailError) {
          console.error('Error sending invitations:', emailError)
          alert('Meeting created but failed to send some email invitations')
        }
      }
      
      navigate(`/meet/${meetingId}`)
    } catch (error) {
      console.error('Error creating meeting:', error)
      alert('Failed to create meeting')
    }
  }

  const scheduleMeeting = async (meetingData) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(meetingData)
      })

      if (!response.ok) throw new Error('Failed to schedule meeting')

      const data = await response.json()
      alert('Meeting scheduled successfully!')
      setShowScheduleModal(false)
      loadMeetings()
    } catch (error) {
      console.error('Error scheduling meeting:', error)
      alert('Failed to schedule meeting')
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const QuickActions = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* New Meeting */}
      <button
        onClick={() => setShowNewMeetingModal(true)}
        className="bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl p-6 text-left transition-all duration-200 transform hover:scale-105 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <FaVideo size={24} />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">New Meeting</h3>
        <p className="text-indigo-100 text-sm">Start an instant meeting</p>
      </button>

      {/* Schedule */}
      <button
        onClick={() => setShowScheduleModal(true)}
        className="bg-gradient-to-br from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl p-6 text-left transition-all duration-200 transform hover:scale-105 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <FaCalendarPlus size={24} />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">Schedule</h3>
        <p className="text-blue-100 text-sm">Plan a meeting for later</p>
      </button>

      {/* Join Meeting */}
      <button
        onClick={() => setShowJoinModal(true)}
        className="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl p-6 text-left transition-all duration-200 transform hover:scale-105 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <FaLink size={24} />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">Join</h3>
        <p className="text-green-100 text-sm">Join with meeting ID</p>
      </button>

      {/* Personal Room */}
      <button
        onClick={() => personalRoom && navigate(`/meet/${personalRoom.room_id}`)}
        className="bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl p-6 text-left transition-all duration-200 transform hover:scale-105 shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <FaUser size={24} />
          </div>
        </div>
        <h3 className="text-xl font-bold mb-2">Personal Room</h3>
        <p className="text-orange-100 text-sm">Your permanent meeting</p>
      </button>
    </div>
  )

  const NewMeetingModal = () => {
    const [title, setTitle] = useState('Instant Meeting')
    const [withPassword, setWithPassword] = useState(false)
    const [password, setPassword] = useState('')
    const [inviteEmails, setInviteEmails] = useState('')

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">New Meeting</h2>
            <button
              onClick={() => setShowNewMeetingModal(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FaTimes className="text-gray-400" size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Meeting Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter meeting title"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
              <div>
                <p className="text-white font-medium">Password Protection</p>
                <p className="text-gray-400 text-sm">Require password to join</p>
              </div>
              <button
                onClick={() => setWithPassword(!withPassword)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  withPassword ? 'bg-indigo-600' : 'bg-gray-600'
                }`}
              >
                <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${
                  withPassword ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
            </div>

            {withPassword && (
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Password</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter password"
                />
              </div>
            )}

            <div>
              <label className="text-gray-300 text-sm mb-2 block">
                Invite via Email (Optional)
              </label>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Enter email addresses separated by commas"
              />
              <p className="text-gray-500 text-xs mt-1">
                Example: john@example.com, jane@example.com
              </p>
            </div>

            <button
              onClick={async () => {
                const meeting = await createInstantMeeting({
                  title,
                  password: withPassword ? password : null,
                  inviteEmails: inviteEmails.split(',').map(e => e.trim()).filter(e => e)
                })
                setShowNewMeetingModal(false)
              }}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Start Meeting Now
            </button>
          </div>
        </div>
      </div>
    )
  }

  const ScheduleMeetingModal = () => {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [duration, setDuration] = useState(60)

    const handleSchedule = () => {
      if (!title || !date || !time) {
        alert('Please fill in all required fields')
        return
      }

      const scheduledStart = new Date(`${date}T${time}`)
      const scheduledEnd = new Date(scheduledStart.getTime() + duration * 60000)

      scheduleMeeting({
        title,
        description,
        scheduled_start: scheduledStart.toISOString(),
        scheduled_end: scheduledEnd.toISOString(),
        scheduled_duration: duration,
        meeting_type: 'scheduled'
      })
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Schedule Meeting</h2>
            <button
              onClick={() => setShowScheduleModal(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FaTimes className="text-gray-400" size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Meeting title"
              />
            </div>

            <div>
              <label className="text-gray-300 text-sm mb-2 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Meeting description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-gray-300 text-sm mb-2 block">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-gray-300 text-sm mb-2 block">Time *</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="text-gray-300 text-sm mb-2 block">Duration (minutes)</label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
                <option value={180}>3 hours</option>
              </select>
            </div>

            <button
              onClick={handleSchedule}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
            >
              Schedule Meeting
            </button>
          </div>
        </div>
      </div>
    )
  }

  const JoinMeetingModal = () => {
    const [meetingId, setMeetingId] = useState('')

    const handleJoin = () => {
      if (meetingId.trim()) {
        navigate(`/meet/${meetingId.trim()}`)
      }
    }

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Join Meeting</h2>
            <button
              onClick={() => setShowJoinModal(false)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <FaTimes className="text-gray-400" size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm mb-2 block">Meeting ID or Link</label>
              <input
                type="text"
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter meeting ID"
                autoFocus
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={!meetingId.trim()}
              className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Join Meeting
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Meetings</h1>
          <p className="text-gray-400">Start, schedule, or join video meetings</p>
        </div>

        {/* Quick Actions */}
        <QuickActions />

        {/* Personal Room Card */}
        {personalRoom && (
          <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-500/30 rounded-xl p-6 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <FaUser className="text-purple-400" size={20} />
                  <h3 className="text-xl font-bold">Personal Meeting Room</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  Your permanent meeting room that you can use anytime
                </p>
                <div className="flex items-center gap-3">
                  <code className="px-4 py-2 bg-gray-800 rounded-lg text-purple-400 font-mono">
                    {personalRoom.room_id}
                  </code>
                  <button
                    onClick={() => copyToClipboard(personalRoom.room_link)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </button>
                  <button
                    onClick={() => navigate(`/meet/${personalRoom.room_id}`)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <FaVideo size={14} />
                    Start
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'upcoming'
                ? 'text-indigo-400 border-indigo-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <FaClock className="inline mr-2" />
            Upcoming ({upcomingMeetings.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'past'
                ? 'text-indigo-400 border-indigo-400'
                : 'text-gray-400 border-transparent hover:text-gray-300'
            }`}
          >
            <FaHistory className="inline mr-2" />
            Past ({pastMeetings.length})
          </button>
        </div>

        {/* Upcoming Meetings */}
        {activeTab === 'upcoming' && (
          <div className="space-y-4">
            {upcomingMeetings.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-xl">
                <FaCalendar className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-400 mb-2">No upcoming meetings</p>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                >
                  Schedule a Meeting
                </button>
              </div>
            ) : (
              upcomingMeetings.map((meeting) => (
                <div key={meeting.id} className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{meeting.title}</h3>
                      {meeting.description && (
                        <p className="text-gray-400 mb-3">{meeting.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-2">
                          <FaCalendar size={14} />
                          {new Date(meeting.scheduled_start).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-2">
                          <FaClock size={14} />
                          {new Date(meeting.scheduled_start).toLocaleTimeString()}
                        </span>
                        {meeting.password && (
                          <span className="flex items-center gap-2">
                            <FaLock size={14} />
                            Password protected
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          copyToClipboard(`${window.location.origin}/meet/${meeting.meeting_id}`)
                          alert('Meeting link copied to clipboard!')
                        }}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors flex items-center gap-2"
                        title="Copy link"
                      >
                        <FaCopy size={16} />
                        <span className="text-sm">Copy</span>
                      </button>
                      <button
                        onClick={() => {
                          const link = `${window.location.origin}/meet/${meeting.meeting_id}`
                          const subject = encodeURIComponent(`Join my meeting: ${meeting.title}`)
                          const body = encodeURIComponent(`You're invited to join my video meeting!\n\nMeeting: ${meeting.title}\nLink: ${link}\n${meeting.password ? `Password: ${meeting.password}` : ''}`)
                          window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
                        title="Share via email"
                      >
                        <FaLink size={14} />
                        <span className="text-sm">Share</span>
                      </button>
                      <button
                        onClick={() => navigate(`/meet/${meeting.meeting_id}`)}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 transition-colors"
                      >
                        <FaPlay size={14} />
                        Start
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Past Meetings */}
        {activeTab === 'past' && (
          <div className="space-y-4">
            {pastMeetings.length === 0 ? (
              <div className="text-center py-12 bg-gray-800 rounded-xl">
                <FaHistory className="mx-auto mb-4 text-gray-600" size={48} />
                <p className="text-gray-400">No past meetings</p>
              </div>
            ) : (
              pastMeetings.map((meeting) => (
                <div key={meeting.id} className="bg-gray-800 rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2">{meeting.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{new Date(meeting.actual_start || meeting.scheduled_start).toLocaleString()}</span>
                        <span className="flex items-center gap-2">
                          <FaUsers size={14} />
                          {meeting.meeting_participants?.length || 0} participants
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showNewMeetingModal && <NewMeetingModal />}
      {showScheduleModal && <ScheduleMeetingModal />}
      {showJoinModal && <JoinMeetingModal />}
    </div>
  )
}

export default Meetings
