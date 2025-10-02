import React from 'react'
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash, 
  FaDesktop,
  FaComments,
  FaUsers,
  FaPhone,
  FaHandPaper,
  FaEllipsisV,
  FaSmile,
  FaRecordVinyl,
  FaTh,
  FaUserCircle
} from 'react-icons/fa'

/**
 * MeetingControls Component
 * Bottom control bar with all meeting actions
 */
const MeetingControls = ({
  isMuted,
  isVideoOn,
  isScreenSharing,
  isHandRaised,
  isRecording,
  showChat,
  showParticipants,
  layout,
  onToggleMute,
  onToggleVideo,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onRaiseHand,
  onSendReaction,
  onToggleRecording,
  onChangeLayout,
  onLeaveMeeting
}) => {
  const reactions = ['👍', '❤️', '😂', '😮', '👏', '🎉']
  const [showReactions, setShowReactions] = React.useState(false)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-6 py-4 z-50">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between">
        {/* Left controls */}
        <div className="flex items-center space-x-3">
          {/* Microphone */}
          <button
            onClick={onToggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <FaMicrophoneSlash className="text-white text-xl" />
            ) : (
              <FaMicrophone className="text-white text-xl" />
            )}
          </button>

          {/* Video */}
          <button
            onClick={onToggleVideo}
            className={`p-4 rounded-full transition-all ${
              !isVideoOn 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? (
              <FaVideo className="text-white text-xl" />
            ) : (
              <FaVideoSlash className="text-white text-xl" />
            )}
          </button>

          {/* Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className={`p-4 rounded-full transition-all ${
              isScreenSharing 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <FaDesktop className="text-white text-xl" />
          </button>

          {/* Reactions */}
          <div className="relative">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
              title="Send reaction"
            >
              <FaSmile className="text-white text-xl" />
            </button>
            
            {showReactions && (
              <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-lg shadow-lg p-2 flex space-x-2">
                {reactions.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      onSendReaction(emoji)
                      setShowReactions(false)
                    }}
                    className="p-2 hover:bg-gray-700 rounded transition-all text-2xl"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Raise Hand */}
          <button
            onClick={onRaiseHand}
            className={`p-4 rounded-full transition-all ${
              isHandRaised 
                ? 'bg-yellow-600 hover:bg-yellow-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isHandRaised ? 'Lower hand' : 'Raise hand'}
          >
            <FaHandPaper className="text-white text-xl" />
          </button>
        </div>

        {/* Center controls */}
        <div className="flex items-center space-x-3">
          {/* Leave Meeting */}
          <button
            onClick={onLeaveMeeting}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full transition-all flex items-center space-x-2"
            title="Leave meeting"
          >
            <FaPhone className="text-white text-lg rotate-135" />
            <span className="text-white font-medium">Leave</span>
          </button>
        </div>

        {/* Right controls */}
        <div className="flex items-center space-x-3">
          {/* Recording */}
          <button
            onClick={onToggleRecording}
            className={`p-4 rounded-full transition-all ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            <FaRecordVinyl className="text-white text-xl" />
          </button>

          {/* Layout */}
          <button
            onClick={onChangeLayout}
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
            title="Change layout"
          >
            {layout === 'grid' ? (
              <FaTh className="text-white text-xl" />
            ) : (
              <FaUserCircle className="text-white text-xl" />
            )}
          </button>

          {/* Participants */}
          <button
            onClick={onToggleParticipants}
            className={`p-4 rounded-full transition-all ${
              showParticipants 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Participants"
          >
            <FaUsers className="text-white text-xl" />
          </button>

          {/* Chat */}
          <button
            onClick={onToggleChat}
            className={`p-4 rounded-full transition-all ${
              showChat 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Chat"
          >
            <FaComments className="text-white text-xl" />
          </button>

          {/* More options */}
          <button
            className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition-all"
            title="More options"
          >
            <FaEllipsisV className="text-white text-xl" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MeetingControls
