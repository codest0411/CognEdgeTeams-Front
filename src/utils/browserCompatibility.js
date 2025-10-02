/**
 * Browser Compatibility Utilities for WebRTC
 * Checks for required features across Chrome, Edge, Firefox, Safari, etc.
 */

/**
 * Check if the browser supports all required WebRTC features
 */
export const checkWebRTCSupport = () => {
  const support = {
    webrtc: false,
    getUserMedia: false,
    getDisplayMedia: false,
    peerConnection: false,
    mediaRecorder: false,
    browser: detectBrowser(),
    warnings: [],
    errors: []
  }

  // Check RTCPeerConnection
  if (window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection) {
    support.peerConnection = true
    support.webrtc = true
  } else {
    support.errors.push('RTCPeerConnection not supported. WebRTC features will not work.')
  }

  // Check getUserMedia
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    support.getUserMedia = true
  } else {
    support.errors.push('getUserMedia not supported. Camera and microphone access will not work.')
  }

  // Check getDisplayMedia (screen sharing)
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    support.getDisplayMedia = true
  } else {
    support.warnings.push('Screen sharing not supported in this browser.')
  }

  // Check MediaRecorder (for recording)
  if (window.MediaRecorder) {
    support.mediaRecorder = true
  } else {
    support.warnings.push('Recording not supported in this browser.')
  }

  // Browser-specific warnings
  if (support.browser.name === 'Safari') {
    support.warnings.push('Safari has limited WebRTC support. Consider using Chrome or Firefox for best experience.')
  }

  if (support.browser.name === 'IE') {
    support.errors.push('Internet Explorer is not supported. Please use Chrome, Edge, or Firefox.')
  }

  // HTTPS check (required for getUserMedia in most browsers)
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    support.errors.push('HTTPS is required for camera and microphone access. Please use HTTPS.')
  }

  return support
}

/**
 * Detect browser name and version
 */
export const detectBrowser = () => {
  const userAgent = navigator.userAgent
  let browserName = 'Unknown'
  let browserVersion = 'Unknown'

  if (userAgent.indexOf('Firefox') > -1) {
    browserName = 'Firefox'
    browserVersion = userAgent.match(/Firefox\/([0-9.]+)/)?.[1] || 'Unknown'
  } else if (userAgent.indexOf('Edg') > -1) {
    browserName = 'Edge'
    browserVersion = userAgent.match(/Edg\/([0-9.]+)/)?.[1] || 'Unknown'
  } else if (userAgent.indexOf('Chrome') > -1 && userAgent.indexOf('Edg') === -1) {
    browserName = 'Chrome'
    browserVersion = userAgent.match(/Chrome\/([0-9.]+)/)?.[1] || 'Unknown'
  } else if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    browserName = 'Safari'
    browserVersion = userAgent.match(/Version\/([0-9.]+)/)?.[1] || 'Unknown'
  } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
    browserName = 'IE'
    browserVersion = userAgent.match(/(?:MSIE |rv:)([0-9.]+)/)?.[1] || 'Unknown'
  }

  return { name: browserName, version: browserVersion }
}

/**
 * Get optimal video constraints for the current browser
 */
export const getOptimalVideoConstraints = () => {
  const browser = detectBrowser()
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Mobile constraints
  if (isMobile) {
    return {
      video: {
        width: { min: 320, ideal: 640, max: 1280 },
        height: { min: 240, ideal: 480, max: 720 },
        frameRate: { min: 15, ideal: 24, max: 30 },
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    }
  }

  // Desktop constraints
  const constraints = {
    video: {
      width: { min: 320, ideal: 1280, max: 1920 },
      height: { min: 240, ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  }

  // Browser-specific adjustments
  if (browser.name === 'Safari') {
    // Safari has issues with high frame rates
    constraints.video.frameRate = { ideal: 24, max: 30 }
  }

  return constraints
}

/**
 * Test camera and microphone access
 */
export const testMediaDevices = async () => {
  const results = {
    camera: { available: false, error: null },
    microphone: { available: false, error: null },
    devices: { cameras: [], microphones: [], speakers: [] }
  }

  try {
    // Request permissions to enumerate devices properly
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    
    // Stop tracks immediately after getting permissions
    stream.getTracks().forEach(track => track.stop())

    // Now enumerate devices (will have labels after permission granted)
    const devices = await navigator.mediaDevices.enumerateDevices()
    
    results.devices.cameras = devices.filter(d => d.kind === 'videoinput')
    results.devices.microphones = devices.filter(d => d.kind === 'audioinput')
    results.devices.speakers = devices.filter(d => d.kind === 'audiooutput')

    results.camera.available = results.devices.cameras.length > 0
    results.microphone.available = results.devices.microphones.length > 0

  } catch (error) {
    if (error.name === 'NotAllowedError') {
      results.camera.error = 'Permission denied'
      results.microphone.error = 'Permission denied'
    } else if (error.name === 'NotFoundError') {
      results.camera.error = 'No camera found'
      results.microphone.error = 'No microphone found'
    } else {
      results.camera.error = error.message
      results.microphone.error = error.message
    }
  }

  return results
}

/**
 * Format error messages for user-friendly display
 */
export const formatMediaError = (error) => {
  const errorMap = {
    'NotAllowedError': {
      title: 'Permission Denied',
      message: 'Please allow camera and microphone access in your browser settings.',
      icon: '🔒'
    },
    'NotFoundError': {
      title: 'Device Not Found',
      message: 'No camera or microphone detected. Please connect your devices.',
      icon: '📹'
    },
    'NotReadableError': {
      title: 'Device In Use',
      message: 'Your camera or microphone is being used by another application.',
      icon: '⚠️'
    },
    'OverconstrainedError': {
      title: 'Settings Not Supported',
      message: 'The requested camera/microphone settings are not supported by your device.',
      icon: '⚙️'
    },
    'SecurityError': {
      title: 'Security Error',
      message: 'Camera and microphone access blocked by security settings. Please use HTTPS.',
      icon: '🔐'
    },
    'TypeError': {
      title: 'Invalid Configuration',
      message: 'Invalid media device configuration. Please try again.',
      icon: '❌'
    }
  }

  return errorMap[error.name] || {
    title: 'Media Error',
    message: error.message || 'An unexpected error occurred while accessing media devices.',
    icon: '⚠️'
  }
}

/**
 * Check if browser is in a secure context (HTTPS or localhost)
 */
export const isSecureContext = () => {
  return window.isSecureContext || 
         window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1'
}

/**
 * Get recommended browser message
 */
export const getRecommendedBrowserMessage = () => {
  const support = checkWebRTCSupport()
  
  if (support.errors.length > 0) {
    return {
      type: 'error',
      message: 'Your browser does not support video conferencing. Please use Chrome, Firefox, or Edge.'
    }
  }
  
  if (support.warnings.length > 0 && support.browser.name === 'Safari') {
    return {
      type: 'warning',
      message: 'For the best experience, we recommend using Chrome, Firefox, or Edge.'
    }
  }
  
  return {
    type: 'success',
    message: 'Your browser fully supports video conferencing.'
  }
}
