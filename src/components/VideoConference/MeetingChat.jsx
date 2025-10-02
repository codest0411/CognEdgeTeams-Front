import React, { useState, useRef, useEffect } from 'react'
import { FaPaperPlane, FaTimes } from 'react-icons/fa'

/**
 * MeetingChat Component
 * Chat sidebar for meeting participants
 */
const MeetingChat = ({ 
  messages = [], 
  currentUser,
  onSendMessage, 
  onClose 
}) => {
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = (e) => {
    e.preventDefault()
    
    if (newMessage.trim()) {
      onSendMessage({
        content: newMessage.trim(),
        message_type: 'text'
      })
      setNewMessage('')
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-80 bg-gray-900 border-l border-gray-700 z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-semibold text-lg">Meeting Chat</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition-all"
          title="Close chat"
        >
          <FaTimes className="text-gray-400 text-xl" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-2">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.sender_id === currentUser?.id || 
                                message.sender_id === currentUser?.user_id
            const senderName = message.sender_name || message.user_name || 'Unknown'

            return (
              <div
                key={message.id || index}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!isOwnMessage && (
                    <p className="text-xs text-gray-400 mb-1 px-1">
                      {senderName}
                    </p>
                  )}
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-white'
                    }`}
                  >
                    <p className="text-sm break-words">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 px-1">
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-all"
          >
            <FaPaperPlane />
          </button>
        </div>
      </form>
    </div>
  )
}

export default MeetingChat
