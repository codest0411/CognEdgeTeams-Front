import React from 'react'
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash,
  FaDesktop,
  FaHandPaper,
  FaCrown,
  FaEllipsisV,
  FaTimes
} from 'react-icons/fa'

/**
 * ParticipantList Component
 * Sidebar showing all meeting participants with actions
 */
const ParticipantList = ({
  participants = [],
  currentUserId,
  isHost,
  onMuteParticipant,
  onRemoveParticipant,
  onPromoteToCoHost,
  onClose
}) => {
  const [selectedParticipantId, setSelectedParticipantId] = React.useState(null)

  const handleParticipantAction = (participantId, action) => {
    switch (action) {
      case 'mute':
        onMuteParticipant(participantId)
        break
      case 'remove':
        onRemoveParticipant(participantId)
        break
      case 'promote':
        onPromoteToCoHost(participantId)
        break
      default:
        break
    }
    setSelectedParticipantId(null)
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 z-40 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg">Participants</h3>
          <p className="text-gray-400 text-sm">{participants.length} in meeting</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition-all"
          title="Close"
        >
          <FaTimes className="text-gray-400 text-xl" />
        </button>
      </div>

      {/* Participant List */}
      <div className="flex-1 overflow-y-auto">
        {participants.map((participant) => {
          const isCurrentUser = participant.id === currentUserId || participant.user_id === currentUserId
          const isHostRole = participant.role === 'host' || participant.role === 'co-host'
          const displayName = participant.user_name || participant.user_email || 'Participant'

          return (
            <div
              key={participant.id}
              className="p-4 hover:bg-gray-800 border-b border-gray-800 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-white text-sm font-medium truncate">
                        {displayName}
                        {isCurrentUser && ' (You)'}
                      </p>
                      {isHostRole && (
                        <FaCrown className="text-yellow-400 text-xs flex-shrink-0" title="Host" />
                      )}
                      {participant.is_hand_raised && (
                        <span className="text-yellow-400 text-sm animate-bounce">✋</span>
                      )}
                    </div>
                    {participant.user_email && (
                      <p className="text-gray-400 text-xs truncate">
                        {participant.user_email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Icons */}
                <div className="flex items-center space-x-2 flex-shrink-0">
                  {participant.is_screen_sharing && (
                    <FaDesktop className="text-blue-400 text-sm" title="Sharing screen" />
                  )}
                  {participant.is_muted ? (
                    <FaMicrophoneSlash className="text-red-500 text-sm" title="Muted" />
                  ) : (
                    <FaMicrophone className="text-green-500 text-sm" title="Unmuted" />
                  )}
                  {!participant.is_video_on && (
                    <FaVideoSlash className="text-red-500 text-sm" title="Camera off" />
                  )}

                  {/* Host Actions */}
                  {isHost && !isCurrentUser && (
                    <div className="relative">
                      <button
                        onClick={() => setSelectedParticipantId(
                          selectedParticipantId === participant.id ? null : participant.id
                        )}
                        className="p-1 hover:bg-gray-700 rounded transition-all"
                      >
                        <FaEllipsisV className="text-gray-400 text-sm" />
                      </button>

                      {selectedParticipantId === participant.id && (
                        <div className="absolute right-0 top-full mt-1 bg-gray-800 rounded-lg shadow-lg py-2 w-48 z-50">
                          {!participant.is_muted && (
                            <button
                              onClick={() => handleParticipantAction(participant.id, 'mute')}
                              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-all"
                            >
                              Mute participant
                            </button>
                          )}
                          {!isHostRole && (
                            <button
                              onClick={() => handleParticipantAction(participant.id, 'promote')}
                              className="w-full px-4 py-2 text-left text-sm text-white hover:bg-gray-700 transition-all"
                            >
                              Make co-host
                            </button>
                          )}
                          <button
                            onClick={() => handleParticipantAction(participant.id, 'remove')}
                            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-700 transition-all"
                          >
                            Remove participant
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-gray-400 text-xs text-center">
          {participants.filter(p => p.is_online).length} active
        </p>
      </div>
    </div>
  )
}

export default ParticipantList
