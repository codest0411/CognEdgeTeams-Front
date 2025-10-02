import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

const TOOLS = {
  PEN: 'pen',
  ERASER: 'eraser',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  LINE: 'line',
  TEXT: 'text',
  SELECT: 'select'
}

const COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000',
  '#FFC0CB', '#A52A2A', '#808080', '#FFFFFF'
]

const BRUSH_SIZES = [2, 4, 6, 8, 12, 16, 20, 24]

export default function Whiteboard() {
  const { user } = useAuth()
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentTool, setCurrentTool] = useState(TOOLS.PEN)
  const [currentColor, setCurrentColor] = useState('#000000')
  const [brushSize, setBrushSize] = useState(4)
  const [whiteboards, setWhiteboards] = useState([])
  const [currentWhiteboard, setCurrentWhiteboard] = useState(null)
  const [showNewWhiteboardModal, setShowNewWhiteboardModal] = useState(false)
  const [newWhiteboardName, setNewWhiteboardName] = useState('')
  const [showToolbar, setShowToolbar] = useState(true)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showBrushPicker, setShowBrushPicker] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [textPosition, setTextPosition] = useState(null)
  const [showTextInput, setShowTextInput] = useState(false)
  const [history, setHistory] = useState([])
  const [historyStep, setHistoryStep] = useState(-1)
  const [shapes, setShapes] = useState([])
  const [startPos, setStartPos] = useState(null)
  const [isShapeDrawing, setIsShapeDrawing] = useState(false)

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // Save initial state
    saveToHistory()
  }, [currentWhiteboard])

  // Fetch whiteboards
  useEffect(() => {
    fetchWhiteboards()
  }, [user])

  const fetchWhiteboards = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('whiteboards')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (!error) {
      setWhiteboards(data || [])
      if (data && data.length > 0 && !currentWhiteboard) {
        setCurrentWhiteboard(data[0])
      }
    }
  }

  const createNewWhiteboard = async () => {
    if (!newWhiteboardName.trim() || !user) return

    const { data, error } = await supabase
      .from('whiteboards')
      .insert([{
        name: newWhiteboardName,
        user_id: user.id,
        canvas_data: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()

    if (!error && data) {
      setWhiteboards(prev => [data[0], ...prev])
      setCurrentWhiteboard(data[0])
      setNewWhiteboardName('')
      setShowNewWhiteboardModal(false)
      
      // Clear canvas
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      saveToHistory()
    }
  }

  const saveWhiteboard = async () => {
    if (!currentWhiteboard || !user) return

    const canvas = canvasRef.current
    const canvasData = canvas.toDataURL()

    await supabase
      .from('whiteboards')
      .update({
        canvas_data: canvasData,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentWhiteboard.id)
  }

  const loadWhiteboard = (whiteboard) => {
    setCurrentWhiteboard(whiteboard)
    
    if (whiteboard.canvas_data) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        saveToHistory()
      }
      
      img.src = whiteboard.canvas_data
    } else {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      saveToHistory()
    }
  }

  const saveToHistory = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const dataURL = canvas.toDataURL()
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyStep + 1)
      newHistory.push(dataURL)
      return newHistory.slice(-50) // Keep last 50 states
    })
    
    setHistoryStep(prev => prev + 1)
  }

  const undo = () => {
    if (historyStep > 0) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      
      setHistoryStep(prev => prev - 1)
      img.src = history[historyStep - 1]
    }
  }

  const redo = () => {
    if (historyStep < history.length - 1) {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
      }
      
      setHistoryStep(prev => prev + 1)
      img.src = history[historyStep + 1]
    }
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    saveToHistory()
  }

  const getMousePos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    }
  }

  const startDrawing = (e) => {
    const pos = getMousePos(e)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (currentTool === TOOLS.TEXT) {
      setTextPosition(pos)
      setShowTextInput(true)
      return
    }

    if ([TOOLS.RECTANGLE, TOOLS.CIRCLE, TOOLS.LINE].includes(currentTool)) {
      setStartPos(pos)
      setIsShapeDrawing(true)
      return
    }

    setIsDrawing(true)
    
    ctx.globalCompositeOperation = currentTool === TOOLS.ERASER ? 'destination-out' : 'source-over'
    ctx.strokeStyle = currentColor
    ctx.lineWidth = brushSize
    
    ctx.beginPath()
    ctx.moveTo(pos.x, pos.y)
  }

  const draw = (e) => {
    if (!isDrawing && !isShapeDrawing) return

    const pos = getMousePos(e)
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    if (isShapeDrawing && startPos) {
      // Clear canvas and redraw from history
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        
        // Draw preview shape
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = currentColor
        ctx.lineWidth = brushSize
        ctx.beginPath()

        if (currentTool === TOOLS.RECTANGLE) {
          const width = pos.x - startPos.x
          const height = pos.y - startPos.y
          ctx.rect(startPos.x, startPos.y, width, height)
        } else if (currentTool === TOOLS.CIRCLE) {
          const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2))
          ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI)
        } else if (currentTool === TOOLS.LINE) {
          ctx.moveTo(startPos.x, startPos.y)
          ctx.lineTo(pos.x, pos.y)
        }
        
        ctx.stroke()
      }
      
      if (history[historyStep]) {
        img.src = history[historyStep]
      }
      return
    }

    if (isDrawing) {
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }
  }

  const stopDrawing = () => {
    if (isShapeDrawing) {
      setIsShapeDrawing(false)
      setStartPos(null)
      saveToHistory()
    }
    
    if (isDrawing) {
      setIsDrawing(false)
      saveToHistory()
    }
  }

  const addText = () => {
    if (!textInput.trim() || !textPosition) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = currentColor
    ctx.font = `${brushSize * 3}px Arial`
    ctx.fillText(textInput, textPosition.x, textPosition.y)
    
    setTextInput('')
    setTextPosition(null)
    setShowTextInput(false)
    saveToHistory()
  }

  const exportCanvas = (format = 'png') => {
    const canvas = canvasRef.current
    const link = document.createElement('a')
    link.download = `${currentWhiteboard?.name || 'whiteboard'}.${format}`
    link.href = canvas.toDataURL(`image/${format}`)
    link.click()
  }

  const importImage = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        
        // Clear canvas
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw imported image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        saveToHistory()
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="h-full flex flex-col bg-[#0f1419]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#1a2332] border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Whiteboard</h1>
          
          {/* Whiteboard Selector */}
          <select
            value={currentWhiteboard?.id || ''}
            onChange={(e) => {
              const selected = whiteboards.find(w => w.id === e.target.value)
              if (selected) loadWhiteboard(selected)
            }}
            className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-1 text-white text-sm"
          >
            <option value="">Select Whiteboard</option>
            {whiteboards.map(wb => (
              <option key={wb.id} value={wb.id}>{wb.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowNewWhiteboardModal(true)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
          >
            New
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            title="Toggle Toolbar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <button
            onClick={saveWhiteboard}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Save
          </button>
          
          <button
            onClick={() => exportCanvas('png')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between p-3 bg-[#1a2332] border-b border-gray-700">
          {/* Tools */}
          <div className="flex items-center gap-1">
            {Object.entries(TOOLS).map(([key, tool]) => (
              <button
                key={tool}
                onClick={() => setCurrentTool(tool)}
                className={`p-3 rounded-lg transition-all duration-200 ${
                  currentTool === tool 
                    ? 'bg-blue-600 text-white shadow-lg transform scale-105' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-300 hover:scale-102'
                }`}
                title={key.charAt(0) + key.slice(1).toLowerCase()}
              >
                {tool === TOOLS.PEN && (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                )}
                {tool === TOOLS.ERASER && (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                )}
                {tool === TOOLS.RECTANGLE && (
                  <div className="w-6 h-4 border-2 border-current rounded-sm"></div>
                )}
                {tool === TOOLS.CIRCLE && (
                  <div className="w-6 h-6 border-2 border-current rounded-full"></div>
                )}
                {tool === TOOLS.LINE && (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
                {tool === TOOLS.TEXT && (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                )}
                {tool === TOOLS.SELECT && (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-12 h-12 rounded-lg border-2 border-gray-500 shadow-lg hover:border-gray-400 transition-all duration-200 hover:scale-105"
                style={{ backgroundColor: currentColor }}
                title="Select Color"
              >
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gray-700 rounded-full flex items-center justify-center border border-gray-600">
                  <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
              {showColorPicker && (
                <div className="absolute top-full mt-2 bg-gray-800 border border-gray-600 rounded-xl p-3 shadow-2xl z-20">
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => {
                          setCurrentColor(color)
                          setShowColorPicker(false)
                        }}
                        className={`w-8 h-8 rounded-lg border-2 hover:scale-110 transition-all duration-200 ${
                          currentColor === color ? 'border-white shadow-lg' : 'border-gray-500 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-gray-400 text-center">
                    Current: {currentColor.toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            {/* Brush Size */}
            <div className="relative">
              <button
                onClick={() => setShowBrushPicker(!showBrushPicker)}
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 hover:scale-105"
                title="Brush Size"
              >
                <div 
                  className="rounded-full bg-current"
                  style={{ 
                    width: `${Math.min(brushSize, 16)}px`, 
                    height: `${Math.min(brushSize, 16)}px` 
                  }}
                ></div>
                <span className="text-sm font-medium">{brushSize}px</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
              {showBrushPicker && (
                <div className="absolute top-full mt-2 bg-gray-800 border border-gray-600 rounded-xl p-3 shadow-2xl z-20 min-w-[180px]">
                  <div className="space-y-2">
                    {BRUSH_SIZES.map(size => (
                      <button
                        key={size}
                        onClick={() => {
                          setBrushSize(size)
                          setShowBrushPicker(false)
                        }}
                        className={`flex items-center gap-3 w-full px-3 py-2 text-left text-white hover:bg-gray-700 rounded-lg transition-all duration-200 ${
                          brushSize === size ? 'bg-blue-600 hover:bg-blue-700' : ''
                        }`}
                      >
                        <div 
                          className="rounded-full bg-current"
                          style={{ 
                            width: `${Math.min(size, 20)}px`, 
                            height: `${Math.min(size, 20)}px` 
                          }}
                        ></div>
                        <span className="text-sm">{size}px</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={undo}
                disabled={historyStep <= 0}
                className="p-2 disabled:opacity-50 disabled:cursor-not-allowed text-white hover:bg-gray-700 rounded-md transition-all duration-200 hover:scale-105"
                title="Undo (Ctrl+Z)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              
              <button
                onClick={redo}
                disabled={historyStep >= history.length - 1}
                className="p-2 disabled:opacity-50 disabled:cursor-not-allowed text-white hover:bg-gray-700 rounded-md transition-all duration-200 hover:scale-105"
                title="Redo (Ctrl+Y)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
                </svg>
              </button>
            </div>
            
            <button
              onClick={clearCanvas}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 hover:scale-105 shadow-lg"
              title="Clear Canvas"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            <label className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all duration-200 hover:scale-105 cursor-pointer shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <input
                type="file"
                accept="image/*"
                onChange={importImage}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
        />

        {/* Text Input Modal */}
        {showTextInput && textPosition && (
          <div
            className="absolute bg-gray-800 border border-gray-600 rounded-lg p-3 z-20"
            style={{
              left: textPosition.x,
              top: textPosition.y
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text..."
              className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-sm mb-2 w-48"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && addText()}
            />
            <div className="flex gap-2">
              <button
                onClick={addText}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowTextInput(false)
                  setTextInput('')
                  setTextPosition(null)
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* New Whiteboard Modal */}
      {showNewWhiteboardModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Create New Whiteboard</h3>
            <input
              type="text"
              value={newWhiteboardName}
              onChange={(e) => setNewWhiteboardName(e.target.value)}
              placeholder="Whiteboard name..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && createNewWhiteboard()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowNewWhiteboardModal(false)
                  setNewWhiteboardName('')
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createNewWhiteboard}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
