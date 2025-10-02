// Audio utility functions for voice chat

export const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 44100,
    channelCount: 1,
    volume: 1.0
  },
  video: false
}

export const checkMicrophonePermission = async () => {
  try {
    const permission = await navigator.permissions.query({ name: 'microphone' })
    return permission.state // 'granted', 'denied', or 'prompt'
  } catch (error) {
    console.error('Error checking microphone permission:', error)
    return 'unknown'
  }
}

export const requestMicrophoneAccess = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(AUDIO_CONSTRAINTS)
    return { success: true, stream }
  } catch (error) {
    console.error('Microphone access denied:', error)
    return { 
      success: false, 
      error: error.name === 'NotAllowedError' 
        ? 'Microphone access denied. Please allow microphone access in your browser settings.'
        : 'Unable to access microphone. Please check your device settings.'
    }
  }
}

export const getAudioDevices = async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.filter(device => device.kind === 'audioinput')
  } catch (error) {
    console.error('Error getting audio devices:', error)
    return []
  }
}

export const createAudioContext = () => {
  try {
    return new (window.AudioContext || window.webkitAudioContext)()
  } catch (error) {
    console.error('Error creating audio context:', error)
    return null
  }
}

export const setupVoiceActivityDetection = (stream, onVoiceActivity) => {
  try {
    const audioContext = createAudioContext()
    if (!audioContext) return null

    const analyser = audioContext.createAnalyser()
    const microphone = audioContext.createMediaStreamSource(stream)
    
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    analyser.minDecibels = -90
    analyser.maxDecibels = -10
    
    microphone.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)
    let isSpeaking = false

    const detectVoice = () => {
      analyser.getByteFrequencyData(dataArray)
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const threshold = 15 // Adjust based on testing
      const currentlySpeaking = average > threshold

      // Only trigger callback on state change
      if (currentlySpeaking !== isSpeaking) {
        isSpeaking = currentlySpeaking
        onVoiceActivity(isSpeaking)
      }

      requestAnimationFrame(detectVoice)
    }

    detectVoice()

    return {
      audioContext,
      analyser,
      stop: () => {
        audioContext.close()
      }
    }
  } catch (error) {
    console.error('Voice activity detection setup failed:', error)
    return null
  }
}

export const muteAudioTrack = (stream, muted) => {
  if (!stream) return

  const audioTrack = stream.getAudioTracks()[0]
  if (audioTrack) {
    audioTrack.enabled = !muted
  }
}

export const stopAudioStream = (stream) => {
  if (!stream) return

  stream.getTracks().forEach(track => {
    track.stop()
  })
}

export const createRemoteAudioElement = (stream, volume = 1.0) => {
  const audio = new Audio()
  audio.srcObject = stream
  audio.autoplay = true
  audio.volume = volume
  audio.controls = false
  
  // Ensure audio plays
  audio.play().catch(error => {
    console.error('Error playing remote audio:', error)
  })

  return audio
}

export const adjustAudioVolume = (audioElement, volume) => {
  if (audioElement && typeof volume === 'number' && volume >= 0 && volume <= 1) {
    audioElement.volume = volume
  }
}

export const getAudioLevel = (analyser) => {
  if (!analyser) return 0

  const dataArray = new Uint8Array(analyser.frequencyBinCount)
  analyser.getByteFrequencyData(dataArray)
  
  // Calculate RMS (Root Mean Square) for more accurate volume
  const rms = Math.sqrt(
    dataArray.reduce((sum, value) => sum + value * value, 0) / dataArray.length
  )
  
  return Math.min(rms / 128, 1) // Normalize to 0-1
}

export const formatAudioError = (error) => {
  switch (error.name) {
    case 'NotAllowedError':
      return 'Microphone access denied. Please allow microphone access and try again.'
    case 'NotFoundError':
      return 'No microphone found. Please connect a microphone and try again.'
    case 'NotReadableError':
      return 'Microphone is being used by another application. Please close other apps and try again.'
    case 'OverconstrainedError':
      return 'Microphone settings are not supported. Please try with different settings.'
    case 'SecurityError':
      return 'Microphone access blocked by security settings. Please check your browser settings.'
    default:
      return 'Unable to access microphone. Please check your device settings and try again.'
  }
}

export const testAudioPlayback = async () => {
  try {
    // Create a short beep to test audio playback
    const audioContext = createAudioContext()
    if (!audioContext) return false

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    gainNode.gain.value = 0.1
    
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.1)
    
    return true
  } catch (error) {
    console.error('Audio playback test failed:', error)
    return false
  }
}

export const getBrowserAudioSupport = () => {
  const hasWebRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection)
  const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
  const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext)
  const hasAudioWorklet = !!(window.AudioWorkletNode)

  return {
    webrtc: hasWebRTC,
    getUserMedia: hasGetUserMedia,
    audioContext: hasAudioContext,
    audioWorklet: hasAudioWorklet,
    fullSupport: hasWebRTC && hasGetUserMedia && hasAudioContext
  }
}
