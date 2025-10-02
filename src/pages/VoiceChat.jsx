import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useParams, useNavigate } from 'react-router-dom'

export default function VoiceChat() {
  const { user } = useAuth()
  const { channelId } = useParams()
  const navigate = useNavigate()
  
  // Voice chat states
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [connectedUsers, setConnectedUsers] = useState([])
  const [channelName, setChannelName] = useState('General')
  const [isLoading, setIsLoading] = useState(true)
  
  // Audio refs
  const localStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const microphoneRef = useRef(null)

  useEffect(() => {
    // Simulate loading and connecting to voice channel
    const timer = setTimeout(() => {
      setIsLoading(false)
      setIsConnected(true)
      // Add current user to connected users
      setConnectedUsers([
        {
          id: user?.id,
          name: user?.email?.split('@')[0] || 'You',
          email: user?.email,
          isMuted: false,
          isDeafened: false,
          isSpeaking: false
        }
      ])
    }, 1500)

    return () => clearTimeout(timer)
  }, [user])

  const requestMicrophoneAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })
      localStreamRef.current = stream
      
      // Create audio context for voice activity detection
      audioContextRef.current = new AudioContext()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      const analyser = audioContextRef.current.createAnalyser()
      source.connect(analyser)
      
      return true
    } catch (error) {
      console.error('Error accessing microphone:', error)
      return false
    }
  }

  const toggleMute = async () => {
    if (!localStreamRef.current) {
      const hasAccess = await requestMicrophoneAccess()
      if (!hasAccess) {
        alert('Microphone access is required for voice chat')
        return
      }
    }

    const audioTracks = localStreamRef.current?.getAudioTracks()
    if (audioTracks?.length > 0) {
      audioTracks[0].enabled = isMuted
      setIsMuted(!isMuted)
      
      // Update user in connected users list
      setConnectedUsers(prev => prev.map(u => 
        u.id === user?.id ? { ...u, isMuted: !isMuted } : u
      ))
    }
  }

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened)
    if (!isDeafened) {
      setIsMuted(true) // Deafening also mutes
    }
    
    // Update user in connected users list
    setConnectedUsers(prev => prev.map(u => 
      u.id === user?.id ? { ...u, isDeafened: !isDeafened, isMuted: !isDeafened ? true : u.isMuted } : u
    ))
  }

  const leaveVoiceChat = () => {
    // Stop all audio tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    
    // Navigate back
    navigate('/app/teams')
  }

  const addDemoUser = () => {
    const demoUsers = [
      { name: 'Alice', email: 'alice@company.com', isMuted: false, isDeafened: false, isSpeaking: Math.random() > 0.7 },
      { name: 'Bob', email: 'bob@company.com', isMuted: true, isDeafened: false, isSpeaking: false },
      { name: 'Charlie', email: 'charlie@company.com', isMuted: false, isDeafened: false, isSpeaking: Math.random() > 0.8 },
      { name: 'Diana', email: 'diana@company.com', isMuted: false, isDeafened: true, isSpeaking: false }
    ]
    
    const randomUser = demoUsers[Math.floor(Math.random() * demoUsers.length)]
    const newUser = {
      ...randomUser,
      id: `demo-${Date.now()}`,
    }
    
    setConnectedUsers(prev => {
      if (prev.find(u => u.email === newUser.email)) return prev
      return [...prev, newUser]
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Connecting to voice channel...</p>
          <p className="text-gray-400 text-sm">#{channelName}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={leaveVoiceChat}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
              <h1 className="text-xl font-semibold">#{channelName}</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{connectedUsers.length} connected</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Connection Status */}
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-medium">Connected to voice channel</span>
            </div>
          </div>

          {/* Connected Users */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Voice Participants ({connectedUsers.length})</h2>
              <button
                onClick={addDemoUser}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
              >
                + Add Demo User
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectedUsers.map((participant) => (
                <div
                  key={participant.id}
                  className={`bg-gray-700 rounded-lg p-4 border-2 transition-all ${
                    participant.isSpeaking 
                      ? 'border-green-500 shadow-lg shadow-green-500/20' 
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
                      participant.isSpeaking ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{participant.name}</h3>
                      <p className="text-sm text-gray-400">{participant.email}</p>
                    </div>
                    <div className="flex gap-1">
                      {participant.isMuted && (
                        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M13.22 3.22a.75.75 0 011.06 0l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 11-1.06-1.06L15.44 8H9a.75.75 0 010-1.5h6.44l-2.22-2.22a.75.75 0 010-1.06z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {participant.isDeafened && (
                        <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Controls */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Voice Controls</h2>
            <div className="flex items-center justify-center gap-4">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isMuted 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06L11.28 10.22l1.97-1.97V4a3 3 0 10-6 0v.879L3.28 2.22zM7.76 6.295L5.255 3.79A7.001 7.001 0 003 8a1 1 0 102 0 5.001 5.001 0 01.755-2.705zM15 8a7.001 7.001 0 01-2.755 5.61l1.51 1.51A8.972 8.972 0 0017 8a1 1 0 10-2 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Deafen Button */}
              <button
                onClick={toggleDeafen}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isDeafened 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
                title={isDeafened ? 'Undeafen' : 'Deafen'}
              >
                {isDeafened ? (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.185A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zM7.752 6.69l1.092 1.092a2.5 2.5 0 013.374 3.373l1.091 1.092a4 4 0 00-5.557-5.557z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM15.657 6.343a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-1.929 5.657 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12a7.972 7.972 0 00-1.343-4.243 1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>

              {/* Leave Button */}
              <button
                onClick={leaveVoiceChat}
                className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center transition-all"
                title="Leave Voice Chat"
              >
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-2 0V4H5v12h10v-2a1 1 0 112 0v3a1 1 0 01-1 1H4a1 1 0 01-1-1V3z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6 10a1 1 0 011-1h6l-2-2a1 1 0 111.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414l2-2H7a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Status Text */}
            <div className="text-center mt-4">
              <p className="text-sm text-gray-400">
                {isMuted && isDeafened && 'You are muted and deafened'}
                {isMuted && !isDeafened && 'You are muted'}
                {!isMuted && isDeafened && 'You are deafened'}
                {!isMuted && !isDeafened && 'Voice chat active'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
