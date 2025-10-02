import { useState, useEffect, useRef, useCallback } from 'react'
import { WebRTCManager, checkWebRTCSupport } from '../utils/webrtcConfig'

export const useWebRTC = (sessionId, user, supabaseChannel) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioError, setAudioError] = useState(null)
  const [speakingUsers, setSpeakingUsers] = useState(new Set())
  const [participants, setParticipants] = useState([])
  
  const webrtcManagerRef = useRef(null)
  const remoteAudiosRef = useRef(new Map())

  // Initialize WebRTC manager
  useEffect(() => {
    const support = checkWebRTCSupport()
    if (!support.supported) {
      setAudioError('WebRTC is not supported in this browser')
      return
    }

    webrtcManagerRef.current = new WebRTCManager()
    
    // Set up speaking change callback
    webrtcManagerRef.current.onSpeakingChange = (isSpeaking) => {
      setSpeakingUsers(prev => {
        const newSet = new Set(prev)
        if (isSpeaking && !isMuted) {
          newSet.add(user?.id)
        } else {
          newSet.delete(user?.id)
        }
        return newSet
      })
    }

    return () => {
      if (webrtcManagerRef.current) {
        webrtcManagerRef.current.cleanup()
      }
      // Clean up remote audio elements
      remoteAudiosRef.current.forEach(audio => {
        audio.pause()
        audio.srcObject = null
      })
      remoteAudiosRef.current.clear()
    }
  }, [user?.id, isMuted])

  // Initialize audio
  const initializeAudio = useCallback(async () => {
    if (!webrtcManagerRef.current) return

    try {
      await webrtcManagerRef.current.initializeAudio()
      setIsAudioEnabled(true)
      setAudioError(null)
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      setAudioError('Microphone access denied. Please allow microphone access.')
      setIsAudioEnabled(false)
    }
  }, [])

  // Handle remote audio stream
  const handleRemoteStream = useCallback((stream, remoteUserId) => {
    console.log('📻 Setting up remote audio for user:', remoteUserId)
    
    // Create or get existing audio element
    let audioElement = remoteAudiosRef.current.get(remoteUserId)
    if (!audioElement) {
      audioElement = new Audio()
      audioElement.autoplay = true
      audioElement.volume = 1.0
      remoteAudiosRef.current.set(remoteUserId, audioElement)
    }

    audioElement.srcObject = stream
    audioElement.play().catch(error => {
      console.error('Error playing remote audio:', error)
    })
  }, [])

  // WebRTC signaling handlers
  const handleWebRTCOffer = useCallback(async ({ offer, from, to }) => {
    if (to !== user?.id || !webrtcManagerRef.current) return

    console.log('📞 Handling WebRTC offer from:', from)
    
    // Create peer connection if it doesn't exist
    if (!webrtcManagerRef.current.peerConnections.has(from)) {
      const peerConnection = webrtcManagerRef.current.createPeerConnection(from, handleRemoteStream)
      
      // Set up ICE candidate handler
      peerConnection.onicecandidate = (event) => {
        if (event.candidate && supabaseChannel) {
          supabaseChannel.send({
            type: 'broadcast',
            event: 'webrtc-ice-candidate',
            payload: {
              candidate: event.candidate,
              from: user?.id,
              to: from
            }
          })
        }
      }
    }

    const answer = await webrtcManagerRef.current.createAnswer(from, offer)
    if (answer && supabaseChannel) {
      supabaseChannel.send({
        type: 'broadcast',
        event: 'webrtc-answer',
        payload: {
          answer: answer,
          from: user?.id,
          to: from
        }
      })
    }
  }, [user?.id, supabaseChannel, handleRemoteStream])

  const handleWebRTCAnswer = useCallback(async ({ answer, from, to }) => {
    if (to !== user?.id || !webrtcManagerRef.current) return

    console.log('📞 Handling WebRTC answer from:', from)
    await webrtcManagerRef.current.handleAnswer(from, answer)
  }, [user?.id])

  const handleICECandidate = useCallback(async ({ candidate, from, to }) => {
    if (to !== user?.id || !webrtcManagerRef.current) return

    console.log('🧊 Handling ICE candidate from:', from)
    await webrtcManagerRef.current.addIceCandidate(from, candidate)
  }, [user?.id])

  // Create peer connection and send offer
  const createPeerConnection = useCallback(async (remoteUserId) => {
    if (!webrtcManagerRef.current || !supabaseChannel) return

    console.log('📞 Creating peer connection to:', remoteUserId)
    
    const peerConnection = webrtcManagerRef.current.createPeerConnection(remoteUserId, handleRemoteStream)
    
    // Set up ICE candidate handler
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        supabaseChannel.send({
          type: 'broadcast',
          event: 'webrtc-ice-candidate',
          payload: {
            candidate: event.candidate,
            from: user?.id,
            to: remoteUserId
          }
        })
      }
    }

    // Create and send offer
    const offer = await webrtcManagerRef.current.createOffer(remoteUserId)
    if (offer) {
      supabaseChannel.send({
        type: 'broadcast',
        event: 'webrtc-offer',
        payload: {
          offer: offer,
          from: user?.id,
          to: remoteUserId
        }
      })
    }
  }, [user?.id, supabaseChannel, handleRemoteStream])

  // Close peer connection
  const closePeerConnection = useCallback((remoteUserId) => {
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.closePeerConnection(remoteUserId)
    }
    
    // Clean up remote audio
    const audioElement = remoteAudiosRef.current.get(remoteUserId)
    if (audioElement) {
      audioElement.pause()
      audioElement.srcObject = null
      remoteAudiosRef.current.delete(remoteUserId)
    }
  }, [])

  // Toggle mute
  const toggleMute = useCallback(() => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    
    if (webrtcManagerRef.current) {
      webrtcManagerRef.current.setMuted(newMutedState)
    }
  }, [isMuted])

  // Set up WebRTC connections for participants
  const setupWebRTCConnections = useCallback((allParticipants) => {
    allParticipants.forEach(participant => {
      if (participant.user_id !== user?.id && 
          !webrtcManagerRef.current?.peerConnections.has(participant.user_id)) {
        createPeerConnection(participant.user_id)
      }
    })
  }, [user?.id, createPeerConnection])

  return {
    isAudioEnabled,
    isMuted,
    audioError,
    speakingUsers,
    participants,
    setParticipants,
    initializeAudio,
    toggleMute,
    handleWebRTCOffer,
    handleWebRTCAnswer,
    handleICECandidate,
    createPeerConnection,
    closePeerConnection,
    setupWebRTCConnections
  }
}
