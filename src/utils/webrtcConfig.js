// WebRTC Configuration Utilities

export const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ],
  iceCandidatePoolSize: 10
}

export const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1
  },
  video: false
}

export const VOICE_ACTIVITY_CONFIG = {
  fftSize: 256,
  smoothingTimeConstant: 0.8,
  minDecibels: -90,
  maxDecibels: -10,
  threshold: 10 // Adjust based on testing
}

export class WebRTCManager {
  constructor() {
    this.localStream = null
    this.peerConnections = new Map()
    this.audioContext = null
    this.analyser = null
    this.onSpeakingChange = null
  }

  async initializeAudio() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS)
      this.setupVoiceActivityDetection()
      return this.localStream
    } catch (error) {
      console.error('Failed to initialize audio:', error)
      throw error
    }
  }

  setupVoiceActivityDetection() {
    if (!this.localStream) return

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      const microphone = this.audioContext.createMediaStreamSource(this.localStream)
      
      this.analyser.fftSize = VOICE_ACTIVITY_CONFIG.fftSize
      this.analyser.smoothingTimeConstant = VOICE_ACTIVITY_CONFIG.smoothingTimeConstant
      this.analyser.minDecibels = VOICE_ACTIVITY_CONFIG.minDecibels
      this.analyser.maxDecibels = VOICE_ACTIVITY_CONFIG.maxDecibels
      
      microphone.connect(this.analyser)
      this.startVoiceDetection()
    } catch (error) {
      console.error('Voice activity detection setup failed:', error)
    }
  }

  startVoiceDetection() {
    if (!this.analyser) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)
    let isSpeaking = false

    const detectVoice = () => {
      this.analyser.getByteFrequencyData(dataArray)
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const currentlySpeaking = average > VOICE_ACTIVITY_CONFIG.threshold

      // Only trigger callback on state change
      if (currentlySpeaking !== isSpeaking) {
        isSpeaking = currentlySpeaking
        if (this.onSpeakingChange) {
          this.onSpeakingChange(isSpeaking)
        }
      }

      requestAnimationFrame(detectVoice)
    }

    detectVoice()
  }

  createPeerConnection(remoteUserId, onRemoteStream) {
    const peerConnection = new RTCPeerConnection(WEBRTC_CONFIG)
    
    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream)
      })
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      if (onRemoteStream) {
        onRemoteStream(event.streams[0], remoteUserId)
      }
    }

    this.peerConnections.set(remoteUserId, peerConnection)
    return peerConnection
  }

  async createOffer(remoteUserId) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (!peerConnection) return null

    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error('Failed to create offer:', error)
      return null
    }
  }

  async createAnswer(remoteUserId, offer) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (!peerConnection) return null

    try {
      await peerConnection.setRemoteDescription(offer)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      return answer
    } catch (error) {
      console.error('Failed to create answer:', error)
      return null
    }
  }

  async handleAnswer(remoteUserId, answer) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (!peerConnection) return

    try {
      await peerConnection.setRemoteDescription(answer)
    } catch (error) {
      console.error('Failed to handle answer:', error)
    }
  }

  async addIceCandidate(remoteUserId, candidate) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (!peerConnection) return

    try {
      await peerConnection.addIceCandidate(candidate)
    } catch (error) {
      console.error('Failed to add ICE candidate:', error)
    }
  }

  setMuted(muted) {
    if (!this.localStream) return

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !muted
    }
  }

  closePeerConnection(remoteUserId) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(remoteUserId)
    }
  }

  cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close())
    this.peerConnections.clear()
  }
}

export const checkWebRTCSupport = () => {
  const hasWebRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext)

  return {
    supported: hasWebRTC && hasGetUserMedia && hasAudioContext,
    webrtc: hasWebRTC,
    getUserMedia: hasGetUserMedia,
    audioContext: hasAudioContext
  }
}

export const getAudioDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(device => device.kind === 'audioinput')
  } catch (error) {
    console.error('Failed to get audio devices:', error)
    return []
  }
}
