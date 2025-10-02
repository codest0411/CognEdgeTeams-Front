import { useState, useEffect } from 'react'

export default function VoiceIndicator({ 
  isSpeaking = false, 
  isMuted = false, 
  userName = 'User',
  size = 'md',
  showName = true 
}) {
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    if (isSpeaking && !isMuted) {
      setAnimationClass('animate-pulse')
    } else {
      setAnimationClass('')
    }
  }, [isSpeaking, isMuted])

  const sizeClasses = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-20 h-20 text-2xl'
  }

  const ringSize = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-18 h-18',
    xl: 'w-22 h-22'
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        {/* User Avatar */}
        <div 
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
            isMuted 
              ? 'bg-red-600 text-white' 
              : isSpeaking 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-600 text-white'
          } ${animationClass}`}
        >
          {userName.charAt(0).toUpperCase()}
        </div>

        {/* Speaking Ring Animation */}
        {isSpeaking && !isMuted && (
          <>
            <div className={`absolute inset-0 ${ringSize[size]} -top-1 -left-1 rounded-full border-4 border-green-400 animate-pulse opacity-75`}></div>
            <div className={`absolute inset-0 ${ringSize[size]} -top-1 -left-1 rounded-full border-2 border-green-300 animate-ping opacity-50`}></div>
          </>
        )}

        {/* Status Indicator */}
        <div className={`absolute -bottom-1 -right-1 ${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} rounded-full flex items-center justify-center ${
          isMuted 
            ? 'bg-red-500' 
            : isSpeaking 
            ? 'bg-green-500 animate-pulse' 
            : 'bg-gray-500'
        }`}>
          <div className={`${size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'} bg-white rounded-full`}></div>
        </div>
      </div>

      {/* User Name and Status */}
      {showName && (
        <div className="text-center">
          <p className={`font-medium text-white ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {userName}
          </p>
          <div className="flex items-center gap-1 justify-center">
            <div className={`${size === 'sm' ? 'w-1 h-1' : 'w-2 h-2'} rounded-full ${
              isMuted 
                ? 'bg-red-400' 
                : isSpeaking 
                ? 'bg-green-400 animate-pulse' 
                : 'bg-gray-400'
            }`}></div>
            <span className={`text-xs ${
              isMuted 
                ? 'text-red-400' 
                : isSpeaking 
                ? 'text-green-400' 
                : 'text-gray-400'
            }`}>
              {isMuted ? 'Muted' : isSpeaking ? 'Speaking' : 'Listening'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
