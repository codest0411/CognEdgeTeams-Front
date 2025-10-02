import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Peer from 'peerjs'
import io from 'socket.io-client'
import VideoTile from '../components/VideoConference/VideoTile'
import MeetingControls from '../components/VideoConference/MeetingControls'
import ParticipantList from '../components/VideoConference/ParticipantList'
import MeetingChat from '../components/VideoConference/MeetingChat'
import PreJoinLobby from '../components/VideoConference/PreJoinLobby'
import { FaTimes } from 'react-icons/fa'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

/**
 * VideoConferenceRoom Component
 * Main meeting room with full video conferencing features
 */
const VideoConferenceRoom = () => {
  const { meetingId } = useParams()
  const navigate = useNavigate()

  // Meeting state
  const [meeting, setMeeting] = useState(null)
  const [hasJoined, setHasJoined] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // User state
  const [currentUser, setCurrentUser] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [isHost, setIsHost] = useState(false)

  // Media state
  const [localStream, setLocalStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenStream, setScreenStream] = useState(null)
  
  // CRITICAL: Use ref to always have current stream in peer callbacks
  const localStreamRef = useRef(null)

  // Participants state
  const [participants, setParticipants] = useState([])
  const [remoteStreams, setRemoteStreams] = useState(new Map())
  const [pinnedParticipantId, setPinnedParticipantId] = useState(null)

  // UI state
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)
  const [layout, setLayout] = useState('grid') // grid or speaker
  const [isRecording, setIsRecording] = useState(false)
  const [chatMessages, setChatMessages] = useState([])
  const [reactions, setReactions] = useState([])
  const [isHandRaised, setIsHandRaised] = useState(false)

  // Refs
  const peerRef = useRef(null)
  const socketRef = useRef(null)
  const peersRef = useRef(new Map())
  const localVideoRef = useRef(null)

  // Load meeting info
  useEffect(() => {
    loadMeetingInfo()
  }, [meetingId])

  // Initialize socket connection
  useEffect(() => {
    if (hasJoined) {
      initializeSocket()
      return () => {
        socketRef.current?.disconnect()
      }
    }
  }, [hasJoined])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
    }
  }, [])
  
  // Update localStreamRef when localStream changes
  useEffect(() => {
    localStreamRef.current = localStream
    console.log('🔄 Updated localStreamRef:', localStream ? 'Stream set' : 'Stream null')
  }, [localStream])

  const loadMeetingInfo = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Meeting not found')
      }
      const data = await response.json()
      setMeeting(data.meeting)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading meeting:', error)
      alert('Failed to load meeting. Redirecting...')
      navigate('/app/meetings')
    }
  }

  const initializeSocket = () => {
    const token = localStorage.getItem('token')
    console.log('🔑 Initializing socket with token:', token ? 'Token exists' : 'NO TOKEN!')
    
    if (!token) {
      console.error('❌ No authentication token found! Please login first.')
      alert('Please login to join the meeting')
      navigate('/login')
      return
    }
    
    // Disconnect existing socket if any
    if (socketRef.current) {
      console.log('⚠️ Disconnecting existing socket before creating new one')
      socketRef.current.removeAllListeners()
      socketRef.current.disconnect()
    }
    
    socketRef.current = io(`${API_URL}/video-conference`, {
      auth: { token },
      transports: ['websocket', 'polling']
    })

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected successfully')
      console.log('🔌 Joining meeting room:', meetingId)
      socketRef.current.emit('join-meeting', { meetingId })
      
      // Also request existing participants immediately
      setTimeout(() => {
        console.log('📋 Requesting existing participants from socket')
        socketRef.current.emit('get-participants', { meetingId })
      }, 1000)
    })
    
    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message)
    })

    socketRef.current.on('participant-joined', (data) => {
      console.log('Participant joined:', data)
      handleParticipantJoined(data)
    })

    socketRef.current.on('participant-left', (data) => {
      console.log('Participant left:', data)
      handleParticipantLeft(data)
    })

    socketRef.current.on('participant-updated', (data) => {
      updateParticipant(data)
    })

    socketRef.current.on('chat-message', (message) => {
      console.log('📨 Received chat message:', message)
      
      // Skip if this is our own message (already added locally)
      const isOwnMessage = message.sender_id === currentUser?.id || 
                          message.sender_id === currentUser?.user_id
      
      if (isOwnMessage) {
        console.log('⏭️ Skipping own message (already in local state)')
        return
      }
      
      // Check for duplicate message by ID
      setChatMessages(prev => {
        const isDuplicate = prev.some(m => m.id === message.id)
        if (isDuplicate) {
          console.log('🔄 Duplicate message detected, skipping:', message.id)
          return prev
        }
        
        // Ensure sender_name is set (fallback to email or ID)
        const messageWithName = {
          ...message,
          sender_name: message.sender_name || message.user_name || message.user_email || message.sender_id || 'Unknown User'
        }
        
        console.log('✅ Adding message from:', messageWithName.sender_name)
        return [...prev, messageWithName]
      })
    })

    socketRef.current.on('reaction', (reaction) => {
      handleReaction(reaction)
    })

    socketRef.current.on('speaking-status', ({ participantId, isSpeaking }) => {
      setParticipants(prev => prev.map(p =>
        p.id === participantId ? { ...p, is_speaking: isSpeaking } : p
      ))
    })

    socketRef.current.on('hand-raised', ({ participantId, isRaised }) => {
      console.log('Hand raised event:', participantId, isRaised)
      setParticipants(prev => prev.map(p =>
        p.id === participantId ? { ...p, is_hand_raised: isRaised } : p
      ))
    })

    socketRef.current.on('participant-removed', ({ participantId }) => {
      console.log('Participant removed:', participantId)
      if (participantId === currentUser?.id) {
        alert('You have been removed from the meeting')
        navigate('/app/meetings')
      } else {
        handleParticipantLeft({ id: participantId })
      }
    })

    // Handle peer connection updates
    socketRef.current.on('peer-connected', (data) => {
      console.log('🔔 Someone connected their peer:', data)
      
      // Update participant with their peer ID
      setParticipants(prev => {
        const updated = prev.map(p =>
          p.id === data.participantId ? { ...p, peer_id: data.peerId } : p
        )
        console.log('📋 Updated participants with peer IDs:', updated.map(p => ({
          name: p.user_name,
          id: p.id,
          peer_id: p.peer_id
        })))
        return updated
      })
      
      // If this is a different participant and we have everything ready, call them
      if (data.participantId !== currentUser?.id && data.peerId && peerRef.current && localStream) {
        console.log('📞 Will call this peer in 1 second:', data.peerId)
        setTimeout(() => {
          console.log('📞 Now calling peer:', data.peerId)
          callPeer(data.peerId)
        }, 1000)
      } else {
        console.log('⏸️ Not calling peer because:', {
          isMe: data.participantId === currentUser?.id,
          hasPeerId: !!data.peerId,
          havePeerRef: !!peerRef.current,
          haveLocalStream: !!localStream
        })
      }
    })

    // Get existing participants in the meeting
    socketRef.current.on('existing-participants', (participants) => {
      console.log('📋 Received existing participants:', participants)
      console.log('📋 Number of existing participants:', participants.length)
      
      if (participants.length === 0) {
        console.log('📋 No existing participants, host is first in meeting')
        return
      }
      
      setParticipants(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const newParticipants = participants
          .filter(p => {
            const isDuplicate = existingIds.has(p.id)
            const isCurrentUser = p.user_id === currentUser?.id || p.id === currentUser?.id
            console.log(`📋 Checking participant ${p.user_name}: duplicate=${isDuplicate}, isCurrentUser=${isCurrentUser}`)
            return !isDuplicate && !isCurrentUser
          })
          .map(p => ({
            ...p,
            is_online: true,
            is_muted: p.is_muted ?? false,
            is_video_on: p.is_video_on ?? true,
            is_screen_sharing: p.is_screen_sharing ?? false,
            is_hand_raised: p.is_hand_raised ?? false,
            connection_quality: 'good'
          }))
        
        const allParticipants = [...prev, ...newParticipants]
        console.log('📋 All participants after merge:', allParticipants.map(p => ({
          name: p.user_name,
          email: p.user_email,
          peer_id: p.peer_id
        })))
        return allParticipants
      })
      
      // Call existing participants who have peer IDs
      console.log('📞 Checking existing participants to call...')
      if (peerRef.current && localStream) {
        participants.forEach(p => {
          if (p.peer_id && p.id !== currentUser?.id) {
            console.log('📞 Will call existing participant:', p.user_name, 'peer_id:', p.peer_id)
            setTimeout(() => {
              if (peerRef.current && localStream) {
                callPeer(p.peer_id)
              }
            }, 2000)
          }
        })
      } else {
        console.log('⏸️ Not ready to call yet - missing peer or stream')
        // Retry after peer is ready
        setTimeout(() => {
          if (peerRef.current && localStream) {
            participants.forEach(p => {
              if (p.peer_id && p.id !== currentUser?.id) {
                console.log('📞 Retry calling:', p.user_name)
                callPeer(p.peer_id)
              }
            })
          }
        }, 3000)
      }
    })
  }

  const initializePeer = async (stream) => {
    try {
      console.log('🔗 Initializing Peer.js with stream:', {
        streamId: stream.id,
        tracks: stream.getTracks().map(t => `${t.kind}: ${t.enabled}`)
      })
      
      // Create Peer instance
      const peer = new Peer({
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      })

      peer.on('open', (peerId) => {
        console.log('✅ My Peer ID:', peerId)
        peerRef.current = peer
        
        // Store in state for easy access
        setParticipants(prev => prev.map(p => 
          p.id === currentUser?.id ? { ...p, peer_id: peerId } : p
        ))
        
        // Update participant with peer ID in database
        updateParticipantPeerId(peerId)
        
        // Broadcast peer ID to other participants via socket
        console.log('📡 Broadcasting my peer ID to meeting:', meetingId)
        socketRef.current?.emit('peer-connected', {
          meetingId,
          participantId: currentUser?.id,
          peerId: peerId
        })
        
        // Request existing participants
        console.log('📡 Requesting existing participants...')
        socketRef.current?.emit('get-participants', { meetingId })
      })

      peer.on('call', (call) => {
        console.log('📞 Receiving call from peer:', call.peer)
        
        // CRITICAL: Use localStreamRef to get current stream
        const currentStream = localStreamRef.current
        if (!currentStream) {
          console.error('❌ No local stream to answer with!')
          console.error('❌ localStreamRef.current is:', localStreamRef.current)
          return
        }
        
        console.log('📞 Answering with stream:', {
          streamId: currentStream.id,
          tracks: currentStream.getTracks().map(t => `${t.kind}: ${t.enabled}`)
        })
        
        call.answer(currentStream)
        console.log('✅ Answered call with stream tracks:', currentStream.getTracks().map(t => t.kind))
        
        call.on('stream', (remoteStream) => {
          console.log('📺 Received remote stream from:', call.peer)
          console.log('📺 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: enabled=${t.enabled}`))
          
          // Verify stream is active
          if (!remoteStream.active) {
            console.warn('⚠️ Received inactive stream from:', call.peer)
          }
          
          // Store stream immediately
          addRemoteStream(call.peer, remoteStream)
        })

        call.on('close', () => {
          console.log('📞 Call closed from:', call.peer)
          removeRemoteStream(call.peer)
          peersRef.current.delete(call.peer)
        })

        call.on('error', (error) => {
          console.error('📞 Call error from', call.peer, ':', error)
          removeRemoteStream(call.peer)
        })

        peersRef.current.set(call.peer, call)
      })

      peer.on('error', (error) => {
        console.error('❌ Peer error:', error)
        if (error.type === 'peer-unavailable') {
          console.warn('⚠️ Peer unavailable, they may have disconnected')
        }
      })
      
      peer.on('disconnected', () => {
        console.warn('⚠️ Peer disconnected, attempting to reconnect...')
        peer.reconnect()
      })

      return peer
    } catch (error) {
      console.error('❌ Error initializing peer:', error)
    }
  }

  const handleJoinMeeting = async (joinData) => {
    try {
      console.log('🎬 Starting join process...')
      console.log('🎬 Join data stream:', {
        streamId: joinData.stream?.id,
        tracks: joinData.stream?.getTracks().map(t => `${t.kind}: ${t.enabled}`)
      })
      
      setDisplayName(joinData.displayName)
      setLocalStream(joinData.stream)
      localStreamRef.current = joinData.stream // Set ref immediately
      setIsMuted(joinData.isMuted)
      setIsVideoOn(joinData.isVideoOn)

      // Join meeting via API
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_name: joinData.displayName,
          password: joinData.password
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to join meeting')
      }

      const data = await response.json()
      const participant = data.participant
      
      console.log('✅ Joined as:', participant.user_name, 'ID:', participant.id)
      
      setCurrentUser(participant)
      setIsHost(participant.role === 'host')
      
      // Initialize with current user in participants list
      setParticipants([{
        ...participant,
        is_online: true,
        is_muted: joinData.isMuted,
        is_video_on: joinData.isVideoOn,
        is_screen_sharing: false,
        is_hand_raised: false,
        connection_quality: 'good'
      }])
      
      setHasJoined(true)

      // Initialize Peer.js with stream
      console.log('🔗 Initializing peer connection...')
      await initializePeer(joinData.stream)

    } catch (error) {
      console.error('❌ Error joining meeting:', error)
      alert(error.message || 'Failed to join meeting')
    }
  }

  const handleParticipantJoined = async (data) => {
    console.log('👤 New participant joined with data:', data)
    
    // Check if participant already exists
    setParticipants(prev => {
      const exists = prev.some(p => p.id === data.id || p.user_id === data.user_id)
      if (exists) {
        console.log('⚠️ Participant already exists, skipping:', data.user_name)
        return prev
      }
      
      // Add participant to list
      const newParticipant = {
        id: data.id,
        user_id: data.user_id,
        user_name: data.user_name,
        user_email: data.user_email,
        peer_id: data.peer_id,  // Store peer ID
        role: data.role || 'participant',
        is_online: true,
        is_muted: data.is_muted ?? false,
        is_video_on: data.is_video_on ?? true,
        is_screen_sharing: false,
        is_hand_raised: false,
        connection_quality: 'good'
      }
      
      console.log('✅ Added participant:', newParticipant.user_name)
      console.log('📊 Total participants now:', prev.length + 1)
      
      return [...prev, newParticipant]
    })

    // Call the new participant if they have a peer ID
    if (data.peer_id && peerRef.current && localStreamRef.current) {
      console.log('Calling new participant with peer ID:', data.peer_id)
      setTimeout(() => {
        callPeer(data.peer_id)
      }, 1000)
    }
  }

  const callPeer = (peerId) => {
    if (!peerRef.current) {
      console.error('❌ Cannot call peer: peerRef not initialized')
      return
    }
    
    // CRITICAL: Use localStreamRef to get current stream
    const currentStream = localStreamRef.current
    if (!currentStream) {
      console.error('❌ Cannot call peer: no local stream')
      console.error('❌ localStreamRef.current is:', localStreamRef.current)
      return
    }
    
    // Don't call if already connected
    if (peersRef.current.has(peerId)) {
      console.log('⚠️ Already connected to peer:', peerId)
      return
    }

    console.log('📞 Calling peer:', peerId)
    console.log('📞 With local stream tracks:', currentStream.getTracks().map(t => `${t.kind}: enabled=${t.enabled}`))
    
    try {
      const call = peerRef.current.call(peerId, currentStream)
      
      if (!call) {
        console.error('❌ Failed to create call to:', peerId)
        return
      }

      call.on('stream', (remoteStream) => {
        console.log('📺 Received remote stream from:', peerId)
        console.log('📺 Remote stream tracks:', remoteStream.getTracks().map(t => `${t.kind}: enabled=${t.enabled}`))
        console.log('📺 Stream active:', remoteStream.active)
        
        addRemoteStream(peerId, remoteStream)
      })

      call.on('close', () => {
        console.log('📞 Call closed with:', peerId)
        removeRemoteStream(peerId)
        peersRef.current.delete(peerId)
      })
      
      call.on('error', (error) => {
        console.error('📞 Call error with', peerId, ':', error)
        removeRemoteStream(peerId)
        peersRef.current.delete(peerId)
      })

      peersRef.current.set(peerId, call)
      console.log('📞 Call initiated successfully to:', peerId)
    } catch (error) {
      console.error('❌ Error calling peer:', peerId, error)
    }
  }

  const handleParticipantLeft = (data) => {
    setParticipants(prev => prev.filter(p => p.id !== data.id))
    removeRemoteStream(data.id)
    
    const peer = peersRef.current.get(data.id)
    if (peer) {
      peer.close()
      peersRef.current.delete(data.id)
    }
  }

  const updateParticipant = (updates) => {
    setParticipants(prev => prev.map(p =>
      p.id === updates.id ? { ...p, ...updates } : p
    ))
  }

  const updateParticipantPeerId = async (peerId) => {
    try {
      const token = localStorage.getItem('token')
      if (!currentUser || !currentUser.id) {
        console.warn('⚠️ Cannot update peer ID: currentUser not set yet')
        return
      }
      
      await fetch(`${API_URL}/api/meetings/${meetingId}/participants/${currentUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ peer_id: peerId })
      })
    } catch (error) {
      console.error('Error updating peer ID:', error)
    }
  }

  const addRemoteStream = (peerId, stream) => {
    console.log('📺 Adding remote stream for peer:', peerId)
    console.log('📺 Stream tracks:', stream.getTracks().map(t => `${t.kind}: ${t.id}, enabled: ${t.enabled}`))
    console.log('📺 Stream active:', stream.active)
    console.log('📺 Stream ID:', stream.id)
    
    setRemoteStreams(prev => {
      const newMap = new Map(prev)
      newMap.set(peerId, stream)
      console.log('📺 Total remote streams:', newMap.size)
      console.log('📺 Remote stream keys:', Array.from(newMap.keys()))
      
      // Also update participant's peer_id if not set
      setParticipants(prevParticipants => 
        prevParticipants.map(p => {
          // If this participant doesn't have a peer_id but matches another way, set it
          if (!p.peer_id && p.id !== currentUser?.id) {
            console.log('🔄 Setting peer_id for participant:', p.user_name, 'to:', peerId)
            return { ...p, peer_id: peerId }
          }
          return p
        })
      )
      
      return newMap
    })
  }

  const removeRemoteStream = (peerId) => {
    console.log('🗑️ Removing remote stream for peer:', peerId)
    setRemoteStreams(prev => {
      const newMap = new Map(prev)
      newMap.delete(peerId)
      console.log('📺 Total remote streams after removal:', newMap.size)
      return newMap
    })
  }

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        const newMutedState = !audioTrack.enabled
        setIsMuted(newMutedState)
        
        // Update local participant state
        setParticipants(prev => prev.map(p =>
          p.id === currentUser?.id ? { ...p, is_muted: newMutedState } : p
        ))
        
        // Notify other participants
        socketRef.current?.emit('participant-update', {
          participantId: currentUser?.id,
          meetingId,
          is_muted: newMutedState
        })
      }
    }
  }

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        const newVideoState = videoTrack.enabled
        setIsVideoOn(newVideoState)
        
        // Update local participant state
        setParticipants(prev => prev.map(p =>
          p.id === currentUser?.id ? { ...p, is_video_on: newVideoState } : p
        ))
        
        // Notify other participants
        socketRef.current?.emit('participant-update', {
          participantId: currentUser?.id,
          meetingId,
          is_video_on: newVideoState
        })
      }
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        console.log('🛑 Stopping screen share...')
        
        // Stop screen sharing
        if (screenStream) {
          screenStream.getTracks().forEach(track => {
            console.log('🛑 Stopping screen track:', track.kind)
            track.stop()
          })
          setScreenStream(null)
        }
        
        // Replace screen share with camera in all peer connections
        if (localStream && localStream.getVideoTracks().length > 0) {
          const cameraTrack = localStream.getVideoTracks()[0]
          console.log('📹 Restoring camera track to peers')
          
          peersRef.current.forEach((call) => {
            const sender = call.peerConnection?.getSenders()?.find(s => s.track?.kind === 'video')
            if (sender) {
              sender.replaceTrack(cameraTrack)
                .then(() => console.log('✅ Camera track restored'))
                .catch(err => console.error('❌ Failed to restore camera:', err))
            }
          })
        }
        
        setIsScreenSharing(false)
        
        socketRef.current?.emit('participant-update', {
          participantId: currentUser?.id,
          meetingId,
          is_screen_sharing: false
        })
      } else {
        console.log('🖥️ Starting screen share...')
        
        // Start REAL screen sharing - NO FAKE FALLBACK
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        
        console.log('✅ Screen share stream obtained:', {
          videoTracks: stream.getVideoTracks().length,
          audioTracks: stream.getAudioTracks().length
        })
        
        setScreenStream(stream)
        setIsScreenSharing(true)
        
        // Replace camera with screen share in all peer connections
        const screenTrack = stream.getVideoTracks()[0]
        console.log('🖥️ Replacing camera with screen share in all peers')
        
        peersRef.current.forEach((call) => {
          const sender = call.peerConnection?.getSenders()?.find(s => s.track?.kind === 'video')
          if (sender) {
            sender.replaceTrack(screenTrack)
              .then(() => console.log('✅ Screen share track sent to peer'))
              .catch(err => console.error('❌ Failed to send screen share:', err))
          }
        })
        
        // Stop screen share when user stops it from browser UI
        screenTrack.onended = () => {
          console.log('🛑 Screen share ended by user')
          toggleScreenShare()
        }
        
        socketRef.current?.emit('participant-update', {
          participantId: currentUser?.id,
          meetingId,
          is_screen_sharing: true
        })
      }
    } catch (error) {
      console.error('❌ Screen share error:', error)
      
      // User-friendly error messages
      let errorMessage = 'Failed to share screen.'
      if (error.name === 'NotAllowedError') {
        errorMessage = 'Screen sharing permission denied. Please allow access and try again.'
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No screen available to share.'
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Screen is already being shared by another application.'
      }
      
      alert(errorMessage)
      setIsScreenSharing(false)
    }
  }


  const sendMessage = (messageData) => {
    const message = {
      id: Date.now(),
      sender_id: currentUser?.id || currentUser?.user_id,
      sender_name: displayName || currentUser?.user_name || currentUser?.user_email || 'You',
      user_name: displayName || currentUser?.user_name,
      user_email: currentUser?.user_email,
      content: messageData.content,
      message_type: messageData.message_type || 'text',
      created_at: new Date().toISOString()
    }

    console.log('📤 Sending chat message:', message)
    
    setChatMessages(prev => [...prev, message])
    socketRef.current?.emit('chat-message', { ...message, meetingId })
  }

  const sendReaction = (emoji) => {
    const reaction = {
      id: Date.now(),
      emoji,
      user_name: displayName,
      x: Math.random() * 100,
      y: Math.random() * 100
    }

    setReactions(prev => [...prev, reaction])
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id))
    }, 3000)

    socketRef.current?.emit('reaction', { ...reaction, meetingId })
  }

  const handleReaction = (reaction) => {
    setReactions(prev => [...prev, reaction])
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id))
    }, 3000)
  }

  const handleRaiseHand = () => {
    const newState = !isHandRaised
    setIsHandRaised(newState)
    
    // Update own participant state
    setParticipants(prev => prev.map(p =>
      p.id === currentUser?.id ? { ...p, is_hand_raised: newState } : p
    ))
    
    // Broadcast to others
    socketRef.current?.emit('raise-hand', {
      meetingId,
      participantId: currentUser?.id,
      isRaised: newState
    })

    // Update in database
    updateParticipantStatus({ is_hand_raised: newState })
  }

  const handleMuteParticipant = async (participantId) => {
    try {
      socketRef.current?.emit('mute-participant', {
        meetingId,
        participantId
      })
    } catch (error) {
      console.error('Error muting participant:', error)
    }
  }

  const handleRemoveParticipant = async (participantId) => {
    if (!confirm('Are you sure you want to remove this participant?')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}/participants/${participantId}/remove`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to remove participant')
      }

      // Notify via socket
      socketRef.current?.emit('remove-participant', {
        meetingId,
        participantId
      })

      // Remove from local state
      handleParticipantLeft({ id: participantId })
    } catch (error) {
      console.error('Error removing participant:', error)
      alert('Failed to remove participant')
    }
  }

  const handlePromoteToCoHost = async (participantId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_URL}/api/meetings/${meetingId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: 'co-host' })
      })

      if (!response.ok) {
        throw new Error('Failed to promote participant')
      }

      // Update local state
      setParticipants(prev => prev.map(p =>
        p.id === participantId ? { ...p, role: 'co-host' } : p
      ))

      // Notify via socket
      socketRef.current?.emit('participant-update', {
        participantId,
        meetingId,
        role: 'co-host'
      })

      alert('Participant promoted to co-host')
    } catch (error) {
      console.error('Error promoting participant:', error)
      alert('Failed to promote participant')
    }
  }

  const updateParticipantStatus = async (updates) => {
    try {
      const token = localStorage.getItem('token')
      await fetch(`${API_URL}/api/meetings/${meetingId}/participants/${currentUser?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })
    } catch (error) {
      console.error('Error updating participant status:', error)
    }
  }

  const handleLeave = async () => {
    if (confirm('Are you sure you want to leave the meeting?')) {
      await leaveMeeting()
    }
  }

  const handleEndMeeting = async () => {
    if (confirm('Are you sure you want to end the meeting for everyone?')) {
      try {
        const token = localStorage.getItem('token')
        await fetch(`${API_URL}/api/meetings/${meetingId}/end`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        await leaveMeeting()
      } catch (error) {
        console.error('Error ending meeting:', error)
        alert('Failed to end meeting')
      }
    }
  }

  const leaveMeeting = async () => {
    try {
      cleanup()
      
      const token = localStorage.getItem('token')
      await fetch(`${API_URL}/api/meetings/${meetingId}/leave`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      navigate('/app/meetings')
    } catch (error) {
      console.error('Error leaving meeting:', error)
      navigate('/app/meetings')
    }
  }

  const cleanup = () => {
    // Stop all media tracks
    localStream?.getTracks().forEach(track => track.stop())
    screenStream?.getTracks().forEach(track => track.stop())
    
    // Close all peer connections
    peersRef.current.forEach(call => call.close())
    peersRef.current.clear()
    
    // Destroy peer
    peerRef.current?.destroy()
    
    // Disconnect socket
    socketRef.current?.emit('leave-meeting', { meetingId })
    socketRef.current?.disconnect()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading meeting...</div>
      </div>
    )
  }

  if (!hasJoined) {
    // Check multiple fields to determine if password is required
    const requiresPassword = 
      meeting?.requires_password || 
      meeting?.is_password_protected || 
      meeting?.password != null
    
    console.log('🔐 Meeting password info:', {
      requires_password: meeting?.requires_password,
      is_password_protected: meeting?.is_password_protected,
      has_password: meeting?.password != null,
      final_requiresPassword: requiresPassword
    })
    
    return (
      <PreJoinLobby
        meetingTitle={meeting?.title}
        meetingId={meetingId}
        requiresPassword={requiresPassword}
        onJoin={handleJoinMeeting}
        onCancel={() => navigate('/app/meetings')}
      />
    )
  }

  return (
    <div className="relative h-screen bg-gray-900 overflow-hidden">
      {/* Main Video Grid */}
      <div className={`
        h-full pb-24 p-4
        ${showChat || showParticipants ? 'pr-96' : ''}
        transition-all duration-300
      `}>
        {/* Screen Share Layout (when someone is sharing) */}
        {isScreenSharing ? (
          <div className="h-full flex flex-col gap-4">
            {/* Large Screen Share View */}
            <div className="flex-1 bg-gray-950 rounded-lg overflow-hidden">
              <VideoTile
                participant={{
                  id: currentUser?.id + '-screen',
                  user_name: displayName + ' (Screen)',
                  user_email: currentUser?.user_email,
                  role: currentUser?.role,
                  is_muted: isMuted,
                  is_video_on: true,
                  is_screen_sharing: true,
                  is_hand_raised: isHandRaised,
                  connection_quality: 'good'
                }}
                stream={screenStream}
                isLocal={true}
                isPinned={true}
                layout="speaker"
              />
            </div>
            
            {/* Small Video thumbnails at Bottom */}
            <div className="h-32 flex gap-2 overflow-x-auto">
              {/* Local Camera */}
              <div className="w-48 h-full flex-shrink-0">
                <VideoTile
                  participant={{
                    id: currentUser?.id,
                    user_name: displayName,
                    user_email: currentUser?.user_email,
                    role: currentUser?.role,
                    is_muted: isMuted,
                    is_video_on: isVideoOn,
                    is_screen_sharing: false,
                    is_hand_raised: isHandRaised,
                    connection_quality: 'good'
                  }}
                  stream={localStream}
                  isLocal={true}
                  isPinned={false}
                  layout="grid"
                />
              </div>
              
              {/* Remote Participants */}
              {participants
                .filter(p => p.id !== currentUser?.id)
                .map((participant) => (
                  <div key={participant.id} className="w-48 h-full flex-shrink-0">
                    <VideoTile
                      participant={participant}
                      stream={remoteStreams.get(participant.peer_id)}
                      isPinned={false}
                      isSpeaking={participant.is_speaking}
                      layout="grid"
                      isHost={isHost}
                    />
                  </div>
                ))}
            </div>
          </div>
        ) : (
          /* Normal Grid Layout */
          <div className={`
            grid gap-4 h-full
            ${layout === 'grid' 
              ? 'auto-rows-fr'
              : 'grid-cols-4 grid-rows-4'
            }
          `}
          style={{
            gridTemplateColumns: layout === 'grid' 
              ? `repeat(${Math.min(Math.ceil(Math.sqrt(participants.length + 1)), 4)}, 1fr)`
              : undefined
          }}>
            {/* Local Video */}
            <VideoTile
              participant={{
                id: currentUser?.id,
                user_name: displayName,
                user_email: currentUser?.user_email,
                role: currentUser?.role,
                is_muted: isMuted,
                is_video_on: isVideoOn,
                is_screen_sharing: false,
                is_hand_raised: isHandRaised,
                connection_quality: 'good'
              }}
              stream={localStream}
              isLocal={true}
              isPinned={pinnedParticipantId === currentUser?.id}
              layout={layout}
              onPin={() => setPinnedParticipantId(
                pinnedParticipantId === currentUser?.id ? null : currentUser?.id
              )}
            />

            {/* Remote Videos */}
            {participants
              .filter(p => p.id !== currentUser?.id)
              .map((participant) => {
                // Try to get stream by peer_id
                let stream = remoteStreams.get(participant.peer_id)
                
                // If not found, try all streams to find a match
                if (!stream && remoteStreams.size > 0) {
                  console.warn('⚠️ Stream not found for peer_id:', participant.peer_id)
                  console.warn('⚠️ Available streams:', Array.from(remoteStreams.keys()))
                  
                  // Try to find by participant id as fallback
                  stream = remoteStreams.get(participant.id)
                }
                
                console.log('🔄 Rendering participant:', {
                  name: participant.user_name,
                  id: participant.id,
                  peer_id: participant.peer_id,
                  hasStream: !!stream,
                  streamKey: stream ? 'found' : 'missing',
                  allStreamKeys: Array.from(remoteStreams.keys()),
                  allParticipants: participants.map(p => ({ name: p.user_name, peer_id: p.peer_id }))
                })
                
                return (
                  <VideoTile
                    key={participant.id}
                    participant={participant}
                    stream={stream}
                    isPinned={pinnedParticipantId === participant.id}
                    isSpeaking={participant.is_speaking}
                    layout={layout}
                    isHost={isHost}
                    onPin={() => setPinnedParticipantId(
                      pinnedParticipantId === participant.id ? null : participant.id
                    )}
                  />
                )
              })}
          </div>
        )}
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="absolute top-0 right-0 w-96 h-full bg-gray-800 shadow-2xl z-30">
          <MeetingChat
            messages={chatMessages}
            currentUser={currentUser}
            onSendMessage={sendMessage}
            onClose={() => setShowChat(false)}
          />
        </div>
      )}

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="absolute top-0 right-0 w-96 h-full bg-gray-800 shadow-2xl z-30">
          <ParticipantList
            participants={participants}
            currentUser={currentUser}
            isHost={isHost}
            onMuteParticipant={handleMuteParticipant}
            onRemoveParticipant={handleRemoveParticipant}
            onPromoteToCoHost={handlePromoteToCoHost}
            onClose={() => {
              console.log('📋 Closing participants sidebar. Total participants:', participants.length)
              setShowParticipants(false)
            }}
          />
        </div>
      )}

      {/* Reactions Overlay */}
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute text-6xl animate-bounce"
          style={{
            left: `${reaction.x}%`,
            top: `${reaction.y}%`,
            animation: 'float-up 3s ease-out forwards'
          }}
        >
          {reaction.emoji}
        </div>
      ))}

      {/* Meeting Controls */}
      <MeetingControls
        isMuted={isMuted}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        isRecording={isRecording}
        showChat={showChat}
        showParticipants={showParticipants}
        isHost={isHost}
        participantCount={participants.length}
        currentLayout={layout}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleScreenShare={toggleScreenShare}
        onToggleChat={() => setShowChat(!showChat)}
        onToggleParticipants={() => {
          console.log('👥 Opening participants list. Current participants:', participants)
          console.log('👥 Total count:', participants.length)
          console.log('👥 Current user:', currentUser)
          console.log('👥 Is host:', isHost)
          setShowParticipants(!showParticipants)
        }}
        onSendReaction={sendReaction}
        onRaiseHand={handleRaiseHand}
        onChangeLayout={setLayout}
        onLeaveMeeting={handleLeave}
        onEndMeeting={handleEndMeeting}
      />

      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-200px);
          }
        }
      `}</style>
    </div>
  )
}

export default VideoConferenceRoom
