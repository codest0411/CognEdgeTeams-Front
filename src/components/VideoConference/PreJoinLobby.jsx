import React, { useState, useRef, useEffect } from 'react'
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa'

const PreJoinLobby = ({ meetingTitle, meetingId, requiresPassword, onJoin, onCancel }) => {
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [stream, setStream] = useState(null)
  const [error, setError] = useState('')
  const videoRef = useRef(null)

  useEffect(() => {
    const storedName = localStorage.getItem('user_name')
    if (storedName) {
      setDisplayName(storedName)
    }

    initializeMedia()

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const initializeMedia = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      setStream(mediaStream)
      
      mediaStream.getAudioTracks()[0].enabled = !isMuted
      mediaStream.getVideoTracks()[0].enabled = isVideoOn
    } catch (err) {
      console.error('Media access error:', err)
      setError('Failed to access camera/microphone')
    }
  }

  const toggleMute = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
        setIsMuted(!isMuted)
      }
    }
  }

  const toggleVideo = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn
        setIsVideoOn(!isVideoOn)
      }
    }
  }

  const handleJoin = () => {
    if (!displayName.trim()) {
      setError('Please enter your name')
      return
    }

    if (requiresPassword && !password) {
      setError('Password required')
      return
    }

    onJoin({ displayName, password, stream, isMuted, isVideoOn })
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden">
        <div className="grid md:grid-cols-2 gap-6 p-8">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{meetingTitle || 'Meeting'}</h2>
            <p className="text-gray-400 mb-6">Join the meeting</p>

            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your name"
                />
              </div>

              {requiresPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter meeting password"
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button onClick={toggleMute} className={`flex-1 p-4 rounded-lg ${isMuted ? 'bg-red-600' : 'bg-gray-700'}`}>
                  {isMuted ? <FaMicrophoneSlash className="mx-auto text-white text-xl" /> : <FaMicrophone className="mx-auto text-white text-xl" />}
                </button>
                <button onClick={toggleVideo} className={`flex-1 p-4 rounded-lg ${!isVideoOn ? 'bg-red-600' : 'bg-gray-700'}`}>
                  {isVideoOn ? <FaVideo className="mx-auto text-white text-xl" /> : <FaVideoSlash className="mx-auto text-white text-xl" />}
                </button>
              </div>

              <div className="flex space-x-3 pt-2">
                <button onClick={handleJoin} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg">
                  Join Meeting
                </button>
                <button onClick={onCancel} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg">
                  Cancel
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 rounded-lg overflow-hidden">
            {isVideoOn && stream ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center"><div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-4">
                    <span className="text-white text-4xl font-bold">{displayName.charAt(0).toUpperCase() || '?'}</span>
                  </div>
                  <p className="text-gray-400">Camera is off</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreJoinLobby
