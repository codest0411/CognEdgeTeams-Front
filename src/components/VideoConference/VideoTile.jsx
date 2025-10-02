import React, { useRef, useEffect } from 'react'
import { FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaDesktop, FaUser } from 'react-icons/fa'

/**
 * VideoTile Component
 * Displays a single participant's video/audio stream
 */
const VideoTile = ({ 
  participant, 
  stream, 
  isPinned = false,
  isLocal = false,
  onPin,
  className = ''
}) => {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      console.log(`📺 Set stream for ${participant?.user_name || 'participant'}:`, {
        streamId: stream.id,
        tracks: stream.getTracks().map(t => `${t.kind}: ${t.enabled}`)
      })
    }
  }, [stream, participant])

  const displayName = participant?.user_name || participant?.user_email || 'Participant'
  const isMuted = participant?.is_muted ?? false
  const isVideoOn = participant?.is_video_on ?? true
  const isScreenSharing = participant?.is_screen_sharing ?? false
  const isHandRaised = participant?.is_hand_raised ?? false
  const isSpeaking = participant?.is_speaking ?? false

  return (
    <div 
      className={`relative bg-gray-900 rounded-lg overflow-hidden ${className} ${
        isPinned ? 'ring-4 ring-blue-500' : ''
      } ${isSpeaking ? 'ring-2 ring-green-500' : ''}`}
      onClick={onPin}
    >
      {/* Video element */}
      {isVideoOn && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-2">
              <FaUser className="text-white text-3xl" />
            </div>
            <p className="text-white text-sm">{displayName}</p>
          </div>
        </div>
      )}

      {/* Overlay information */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-white text-sm font-medium truncate max-w-[150px]">
              {displayName} {isLocal && '(You)'}
            </span>
            {isHandRaised && (
              <span className="text-yellow-400 animate-bounce">✋</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {isScreenSharing && (
              <div className="bg-blue-600 rounded px-2 py-1">
                <FaDesktop className="text-white text-xs" />
              </div>
            )}
            {isMuted ? (
              <FaMicrophoneSlash className="text-red-500 text-sm" />
            ) : (
              <FaMicrophone className="text-green-500 text-sm" />
            )}
            {!isVideoOn && (
              <FaVideoSlash className="text-red-500 text-sm" />
            )}
          </div>
        </div>
      </div>

      {/* Connection quality indicator */}
      <div className="absolute top-2 right-2">
        <div className={`w-2 h-2 rounded-full ${
          participant?.connection_quality === 'good' ? 'bg-green-500' :
          participant?.connection_quality === 'medium' ? 'bg-yellow-500' :
          'bg-red-500'
        }`} />
      </div>

      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs">
          Pinned
        </div>
      )}
    </div>
  )
}

export default VideoTile
