import { useState } from 'react'

export default function AudioPermissionModal({ 
  isOpen, 
  onClose, 
  onRetry, 
  error 
}) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
      onClose()
    } catch (err) {
      console.error('Retry failed:', err)
    } finally {
      setIsRetrying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">
            Microphone Access Required
          </h3>
          
          <p className="text-gray-300 mb-4">
            {error || 'To join the voice chat, please allow microphone access when prompted by your browser.'}
          </p>

          <div className="bg-blue-900/30 border border-blue-600 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-300 mb-2">How to enable microphone:</h4>
            <ul className="text-sm text-blue-200 text-left space-y-1">
              <li>• Click the microphone icon in your browser's address bar</li>
              <li>• Select "Allow" when prompted</li>
              <li>• Refresh the page if needed</li>
              <li>• Check your browser's microphone settings</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRetrying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Trying...
                </>
              ) : (
                <>
                  🎤 Try Again
                </>
              )}
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-400">
            <p>Voice chat requires microphone access to work properly.</p>
            <p>Your audio will only be shared with other participants in this session.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
