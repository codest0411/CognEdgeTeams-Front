// Video Conferencing WebRTC Manager
import { WEBRTC_CONFIG } from './webrtcConfig'

export const VIDEO_CONSTRAINTS = {
  video: {
    width: { min: 320, ideal: 1280, max: 1920 },
    height: { min: 240, ideal: 720, max: 1080 },
    frameRate: { min: 15, ideal: 30, max: 60 },
    facingMode: 'user'
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1
  }
}

export const SCREEN_SHARE_CONSTRAINTS = {
  video: {
    cursor: 'always',
    displaySurface: 'monitor'
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
}

export class VideoWebRTCManager {
  constructor() {
    this.localStream = null
    this.localVideoStream = null
    this.screenShareStream = null
    this.peerConnections = new Map()
    this.remoteStreams = new Map()
    this.dataChannels = new Map()
    this.isVideoEnabled = false
    this.isAudioEnabled = false
    this.isScreenSharing = false
    
    // Callbacks
    this.onRemoteStream = null
    this.onRemoteStreamRemoved = null
    this.onDataChannelMessage = null
    this.onConnectionStateChange = null
    this.onSpeakingChange = null
    
    // Voice activity detection
    this.audioContext = null
    this.analyser = null
    this.speakingUsers = new Set()
  }

  // Initialize video and audio
  async initializeMedia(videoEnabled = true, audioEnabled = true) {
    try {
      const constraints = {
        video: videoEnabled ? VIDEO_CONSTRAINTS.video : false,
        audio: audioEnabled ? VIDEO_CONSTRAINTS.audio : false
      }

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      this.isVideoEnabled = videoEnabled
      this.isAudioEnabled = audioEnabled

      if (audioEnabled) {
        this.setupVoiceActivityDetection()
      }

      return this.localStream
    } catch (error) {
      console.error('Failed to initialize media:', error)
      throw new Error(this.formatMediaError(error))
    }
  }

  // Setup voice activity detection
  setupVoiceActivityDetection() {
    if (!this.localStream) return

    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      const microphone = this.audioContext.createMediaStreamSource(this.localStream)
      
      this.analyser.fftSize = 256
      this.analyser.smoothingTimeConstant = 0.8
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
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const currentlySpeaking = average > 15 && this.isAudioEnabled

      if (currentlySpeaking !== isSpeaking) {
        isSpeaking = currentlySpeaking
        if (this.onSpeakingChange) {
          this.onSpeakingChange(isSpeaking)
        }
      }

      if (this.audioContext && this.audioContext.state === 'running') {
        requestAnimationFrame(detectVoice)
      }
    }

    detectVoice()
  }

  // Create peer connection
  createPeerConnection(remoteUserId, isInitiator = false) {
    const peerConnection = new RTCPeerConnection(WEBRTC_CONFIG)
    
    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, this.localStream)
      })
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('📺 Received remote stream from:', remoteUserId)
      const remoteStream = event.streams[0]
      this.remoteStreams.set(remoteUserId, remoteStream)
      
      if (this.onRemoteStream) {
        this.onRemoteStream(remoteStream, remoteUserId)
      }
    }

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${remoteUserId}:`, peerConnection.connectionState)
      
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(remoteUserId, peerConnection.connectionState)
      }

      if (peerConnection.connectionState === 'disconnected' || 
          peerConnection.connectionState === 'failed') {
        this.handlePeerDisconnection(remoteUserId)
      }
    }

    // Create data channel for chat and reactions
    if (isInitiator) {
      const dataChannel = peerConnection.createDataChannel('chat', {
        ordered: true
      })
      this.setupDataChannel(dataChannel, remoteUserId)
    } else {
      peerConnection.ondatachannel = (event) => {
        this.setupDataChannel(event.channel, remoteUserId)
      }
    }

    this.peerConnections.set(remoteUserId, peerConnection)
    return peerConnection
  }

  // Setup data channel for chat and reactions
  setupDataChannel(dataChannel, remoteUserId) {
    this.dataChannels.set(remoteUserId, dataChannel)

    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${remoteUserId}`)
    }

    dataChannel.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (this.onDataChannelMessage) {
          this.onDataChannelMessage(data, remoteUserId)
        }
      } catch (error) {
        console.error('Error parsing data channel message:', error)
      }
    }

    dataChannel.onerror = (error) => {
      console.error(`Data channel error with ${remoteUserId}:`, error)
    }
  }

  // Send data through data channel
  sendDataChannelMessage(remoteUserId, data) {
    const dataChannel = this.dataChannels.get(remoteUserId)
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(data))
      return true
    }
    return false
  }

  // Broadcast to all data channels
  broadcastDataChannelMessage(data) {
    let sentCount = 0
    this.dataChannels.forEach((dataChannel, remoteUserId) => {
      if (this.sendDataChannelMessage(remoteUserId, data)) {
        sentCount++
      }
    })
    return sentCount
  }

  // Create offer
  async createOffer(remoteUserId) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (!peerConnection) return null

    try {
      const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      })
      await peerConnection.setLocalDescription(offer)
      return offer
    } catch (error) {
      console.error('Failed to create offer:', error)
      return null
    }
  }

  // Create answer
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

  // Handle answer
  async handleAnswer(remoteUserId, answer) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (!peerConnection) return

    try {
      await peerConnection.setRemoteDescription(answer)
    } catch (error) {
      console.error('Failed to handle answer:', error)
    }
  }

  // Add ICE candidate
  async addIceCandidate(remoteUserId, candidate) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (!peerConnection) return

    try {
      await peerConnection.addIceCandidate(candidate)
    } catch (error) {
      console.error('Failed to add ICE candidate:', error)
    }
  }

  // Toggle video
  async toggleVideo() {
    if (!this.localStream) return false

    const videoTrack = this.localStream.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      this.isVideoEnabled = videoTrack.enabled
      return this.isVideoEnabled
    }

    // If no video track, try to add one
    if (!this.isVideoEnabled) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ 
          video: VIDEO_CONSTRAINTS.video 
        })
        const videoTrack = videoStream.getVideoTracks()[0]
        
        // Add video track to existing stream
        this.localStream.addTrack(videoTrack)
        
        // Add to all peer connections
        this.peerConnections.forEach(pc => {
          pc.addTrack(videoTrack, this.localStream)
        })
        
        this.isVideoEnabled = true
        return true
      } catch (error) {
        console.error('Failed to enable video:', error)
        return false
      }
    }

    return this.isVideoEnabled
  }

  // Toggle audio
  toggleAudio() {
    if (!this.localStream) return false

    const audioTrack = this.localStream.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      this.isAudioEnabled = audioTrack.enabled
      return this.isAudioEnabled
    }
    return false
  }

  // Start screen sharing
  async startScreenShare() {
    try {
      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_SHARE_CONSTRAINTS)
      
      const videoTrack = this.screenShareStream.getVideoTracks()[0]
      
      // Replace video track in all peer connections
      this.peerConnections.forEach(async (pc) => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          await sender.replaceTrack(videoTrack)
        }
      })

      // Handle screen share end
      videoTrack.onended = () => {
        this.stopScreenShare()
      }

      this.isScreenSharing = true
      return this.screenShareStream
    } catch (error) {
      console.error('Failed to start screen share:', error)
      throw error
    }
  }

  // Stop screen sharing
  async stopScreenShare() {
    if (!this.screenShareStream) return

    // Stop screen share stream
    this.screenShareStream.getTracks().forEach(track => track.stop())
    
    // Replace with camera video if available
    if (this.localStream && this.isVideoEnabled) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        this.peerConnections.forEach(async (pc) => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          )
          if (sender) {
            await sender.replaceTrack(videoTrack)
          }
        })
      }
    }

    this.screenShareStream = null
    this.isScreenSharing = false
  }

  // Get available devices
  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      return {
        cameras: devices.filter(device => device.kind === 'videoinput'),
        microphones: devices.filter(device => device.kind === 'audioinput'),
        speakers: devices.filter(device => device.kind === 'audiooutput')
      }
    } catch (error) {
      console.error('Failed to get devices:', error)
      return { cameras: [], microphones: [], speakers: [] }
    }
  }

  // Switch camera
  async switchCamera(deviceId) {
    try {
      const constraints = {
        video: { ...VIDEO_CONSTRAINTS.video, deviceId: { exact: deviceId } }
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      const newVideoTrack = newStream.getVideoTracks()[0]
      
      // Replace video track in local stream
      const oldVideoTrack = this.localStream.getVideoTracks()[0]
      if (oldVideoTrack) {
        this.localStream.removeTrack(oldVideoTrack)
        oldVideoTrack.stop()
      }
      this.localStream.addTrack(newVideoTrack)
      
      // Replace in all peer connections
      this.peerConnections.forEach(async (pc) => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        )
        if (sender) {
          await sender.replaceTrack(newVideoTrack)
        }
      })
      
      return true
    } catch (error) {
      console.error('Failed to switch camera:', error)
      return false
    }
  }

  // Switch microphone
  async switchMicrophone(deviceId) {
    try {
      const constraints = {
        audio: { ...VIDEO_CONSTRAINTS.audio, deviceId: { exact: deviceId } }
      }
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      const newAudioTrack = newStream.getAudioTracks()[0]
      
      // Replace audio track in local stream
      const oldAudioTrack = this.localStream.getAudioTracks()[0]
      if (oldAudioTrack) {
        this.localStream.removeTrack(oldAudioTrack)
        oldAudioTrack.stop()
      }
      this.localStream.addTrack(newAudioTrack)
      
      // Replace in all peer connections
      this.peerConnections.forEach(async (pc) => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'audio'
        )
        if (sender) {
          await sender.replaceTrack(newAudioTrack)
        }
      })
      
      // Restart voice activity detection
      this.setupVoiceActivityDetection()
      
      return true
    } catch (error) {
      console.error('Failed to switch microphone:', error)
      return false
    }
  }

  // Handle peer disconnection
  handlePeerDisconnection(remoteUserId) {
    console.log(`Peer ${remoteUserId} disconnected`)
    
    // Remove remote stream
    this.remoteStreams.delete(remoteUserId)
    
    // Close data channel
    const dataChannel = this.dataChannels.get(remoteUserId)
    if (dataChannel) {
      dataChannel.close()
      this.dataChannels.delete(remoteUserId)
    }
    
    if (this.onRemoteStreamRemoved) {
      this.onRemoteStreamRemoved(remoteUserId)
    }
  }

  // Close peer connection
  closePeerConnection(remoteUserId) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(remoteUserId)
    }
    
    this.handlePeerDisconnection(remoteUserId)
  }

  // Get connection stats
  async getConnectionStats(remoteUserId) {
    const peerConnection = this.peerConnections.get(remoteUserId)
    if (!peerConnection) return null

    try {
      const stats = await peerConnection.getStats()
      const result = {
        audio: { bitrate: 0, packetsLost: 0, jitter: 0 },
        video: { bitrate: 0, packetsLost: 0, frameRate: 0 }
      }

      stats.forEach(report => {
        if (report.type === 'inbound-rtp') {
          if (report.kind === 'audio') {
            result.audio.bitrate = report.bytesReceived * 8 / report.timestamp * 1000
            result.audio.packetsLost = report.packetsLost
            result.audio.jitter = report.jitter
          } else if (report.kind === 'video') {
            result.video.bitrate = report.bytesReceived * 8 / report.timestamp * 1000
            result.video.packetsLost = report.packetsLost
            result.video.frameRate = report.framesPerSecond
          }
        }
      })

      return result
    } catch (error) {
      console.error('Failed to get connection stats:', error)
      return null
    }
  }

  // Format media error messages
  formatMediaError(error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Camera and microphone access denied. Please allow access and try again.'
      case 'NotFoundError':
        return 'No camera or microphone found. Please connect devices and try again.'
      case 'NotReadableError':
        return 'Camera or microphone is being used by another application.'
      case 'OverconstrainedError':
        return 'Camera or microphone settings are not supported.'
      case 'SecurityError':
        return 'Camera and microphone access blocked by security settings.'
      default:
        return 'Unable to access camera or microphone. Please check your device settings.'
    }
  }

  // Cleanup all resources
  cleanup() {
    // Stop local streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }
    
    if (this.screenShareStream) {
      this.screenShareStream.getTracks().forEach(track => track.stop())
      this.screenShareStream = null
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close())
    this.peerConnections.clear()

    // Close all data channels
    this.dataChannels.forEach(dc => dc.close())
    this.dataChannels.clear()

    // Clear remote streams
    this.remoteStreams.clear()

    // Reset state
    this.isVideoEnabled = false
    this.isAudioEnabled = false
    this.isScreenSharing = false
  }
}

// Utility functions
export const checkVideoWebRTCSupport = () => {
  const hasWebRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  const hasGetDisplayMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia)
  const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext)

  return {
    supported: hasWebRTC && hasGetUserMedia && hasAudioContext,
    webrtc: hasWebRTC,
    getUserMedia: hasGetUserMedia,
    getDisplayMedia: hasGetDisplayMedia,
    audioContext: hasAudioContext,
    screenShare: hasGetDisplayMedia
  }
}

export const getOptimalVideoConstraints = () => {
  // Detect device capabilities and return optimal constraints
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  if (isMobile) {
    return {
      video: {
        width: { min: 320, ideal: 640, max: 1280 },
        height: { min: 240, ideal: 480, max: 720 },
        frameRate: { min: 15, ideal: 24, max: 30 }
      },
      audio: VIDEO_CONSTRAINTS.audio
    }
  }
  
  return VIDEO_CONSTRAINTS
}
