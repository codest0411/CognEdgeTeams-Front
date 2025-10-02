import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

export default function DocumentEditor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { documentId } = useParams();
  const editorRef = useRef(null);
  
  const [document, setDocument] = useState({
    id: null,
    title: 'Untitled Document',
    content: '',
    created_at: null,
    updated_at: null,
    word_count: 0,
    character_count: 0
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [autoSave, setAutoSave] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  
  // Formatting states
  const [formatting, setFormatting] = useState({
    fontFamily: 'Inter',
    fontSize: '14',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    color: '#ffffff'
  });

  useEffect(() => {
    if (documentId && documentId !== 'new') {
      loadDocument(documentId);
    }
  }, [documentId]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && document.content && document.id) {
      const saveTimer = setTimeout(() => {
        saveDocument();
      }, 2000);
      return () => clearTimeout(saveTimer);
    }
  }, [document.content, autoSave]);

  const loadDocument = async (id) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      
      setDocument({
        ...data,
        word_count: countWords(data.content),
        character_count: data.content.length
      });
    } catch (error) {
      console.error('Error loading document:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDocument = async () => {
    if (!user || isSaving) return;
    
    setIsSaving(true);
    try {
      const documentData = {
        title: document.title,
        content: document.content,
        user_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (document.id) {
        // Update existing document
        const { error } = await supabase
          .from('documents')
          .update(documentData)
          .eq('id', document.id);
        
        if (error) throw error;
      } else {
        // Create new document
        const { data, error } = await supabase
          .from('documents')
          .insert(documentData)
          .select()
          .single();
        
        if (error) throw error;
        setDocument(prev => ({ ...prev, id: data.id }));
        navigate(`/app/documents/${data.id}`, { replace: true });
      }
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const countWords = (text) => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const handleContentChange = (e) => {
    const content = e.target.value;
    setDocument(prev => ({
      ...prev,
      content,
      word_count: countWords(content),
      character_count: content.length
    }));
  };

  const handleTitleChange = (e) => {
    setDocument(prev => ({ ...prev, title: e.target.value }));
  };

  const applyFormatting = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    setSelectedText(selection.toString());
  };

  const exportDocument = (format) => {
    const content = document.content;
    const title = document.title || 'document';
    
    switch (format) {
      case 'txt':
        downloadFile(content, `${title}.txt`, 'text/plain');
        break;
      case 'html':
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${title}</title>
              <meta charset="UTF-8">
              <style>
                body { font-family: Inter, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
              </style>
            </head>
            <body>
              <h1>${title}</h1>
              <div>${content.replace(/\n/g, '<br>')}</div>
            </body>
          </html>
        `;
        downloadFile(htmlContent, `${title}.html`, 'text/html');
        break;
      case 'pdf':
        // For PDF export, we'd typically use a library like jsPDF
        alert('PDF export functionality would require additional libraries');
        break;
    }
    setShowExportMenu(false);
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteDocument = async () => {
    if (!document.id || !user) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', document.id)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Navigate back to documents list
      navigate('/app/documents');
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1419]">
        <div className="text-white">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0f1419] flex flex-col">
      {/* Header */}
      <div className="bg-[#1a1f2e] border-b border-gray-700 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              value={document.title}
              onChange={handleTitleChange}
              className="bg-transparent text-white text-lg font-medium border-none outline-none focus:bg-gray-800 rounded px-2 py-1 min-w-[200px]"
              placeholder="Document Title..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/app/documents')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            Back
          </button>
          {document.id && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
              title="Delete Document"
            >
              Delete
            </button>
          )}
          <button
            onClick={saveDocument}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              Export TXT
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[#202c33] border border-gray-600 rounded-md shadow-lg z-10">
                <button
                  onClick={() => exportDocument('txt')}
                  className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-t-md"
                >
                  Export TXT
                </button>
                <button
                  onClick={() => exportDocument('html')}
                  className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700"
                >
                  Export HTML
                </button>
                <button
                  onClick={() => exportDocument('pdf')}
                  className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700 rounded-b-md"
                >
                  Export PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#1a1f2e] border-b border-gray-700 px-6 py-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Font Family */}
          <select
            value={formatting.fontFamily}
            onChange={(e) => setFormatting(prev => ({ ...prev, fontFamily: e.target.value }))}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-blue-500 outline-none"
          >
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </select>

          {/* Font Size */}
          <select
            value={formatting.fontSize}
            onChange={(e) => setFormatting(prev => ({ ...prev, fontSize: e.target.value }))}
            className="bg-gray-700 text-white rounded px-3 py-1 text-sm border border-gray-600 focus:border-blue-500 outline-none"
          >
            <option value="10">10px</option>
            <option value="12">12px</option>
            <option value="14">14px</option>
            <option value="16">16px</option>
            <option value="18">18px</option>
            <option value="20">20px</option>
            <option value="24">24px</option>
            <option value="32">32px</option>
          </select>

          <div className="w-px h-6 bg-gray-600"></div>

          {/* Formatting Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => applyFormatting('bold')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Bold"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 4a1 1 0 011-1h3a3 3 0 110 6H6v2h3a3 3 0 110 6H6a1 1 0 01-1-1V4zm2 1v4h2a1 1 0 100-2H7zm0 6v4h3a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => applyFormatting('italic')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Italic"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 011-1h2a1 1 0 110 2h-.5L9.5 12H10a1 1 0 110 2H8a1 1 0 110-2h.5L9.5 8H9a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => applyFormatting('underline')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Underline"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 17h12v1H4v-1zM6 3v6a4 4 0 108 0V3h-2v6a2 2 0 11-4 0V3H6z" />
              </svg>
            </button>
            <button
              onClick={() => applyFormatting('strikeThrough')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Strikethrough"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 10h14v1H3v-1zM6 6h8v1H6V6zM6 13h8v1H6v-1z" />
              </svg>
            </button>
          </div>

          <div className="w-px h-6 bg-gray-600"></div>

          {/* Alignment */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => applyFormatting('justifyLeft')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Align Left"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h8a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => applyFormatting('justifyCenter')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Center"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm-2 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm2 4a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => applyFormatting('justifyRight')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Align Right"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1zm-4 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm4 4a1 1 0 011-1h8a1 1 0 110 2H8a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="w-px h-6 bg-gray-600"></div>

          {/* Lists */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => applyFormatting('insertUnorderedList')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Bullet List"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 100 2 1 1 0 000-2zM6 4a1 1 0 011-1h9a1 1 0 110 2H7a1 1 0 01-1-1zm0 4a1 1 0 011-1h9a1 1 0 110 2H7a1 1 0 01-1-1zm0 4a1 1 0 011-1h9a1 1 0 110 2H7a1 1 0 01-1-1zM3 8a1 1 0 100 2 1 1 0 000-2zm0 4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => applyFormatting('insertOrderedList')}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Numbered List"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="w-px h-6 bg-gray-600"></div>

          {/* Insert */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => applyFormatting('createLink', prompt('Enter URL:'))}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Insert Link"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      applyFormatting('insertImage', e.target.result);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="p-2 hover:bg-gray-700 text-white rounded transition-colors"
              title="Insert Image"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Editor */}
      <div className="flex-1 flex">
        {/* Editor Area */}
        <div className="flex-1 bg-white rounded-lg m-6 shadow-2xl overflow-hidden">
          <textarea
            ref={editorRef}
            value={document.content}
            onChange={handleContentChange}
            onSelect={handleTextSelection}
            className="w-full h-full p-8 text-gray-900 resize-none outline-none"
            style={{
              fontFamily: formatting.fontFamily,
              fontSize: `${formatting.fontSize}px`,
              lineHeight: '1.6'
            }}
            placeholder="Start writing your document..."
          />
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#1a1f2e] border-t border-gray-700 px-6 py-2 flex items-center justify-between text-sm text-gray-400">
        <div className="flex items-center gap-6">
          <span>Words: {document.word_count}</span>
          <span>Characters: {document.character_count}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${autoSave ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span>Autosave & Real-time enabled</span>
          </div>
          {lastSaved && (
            <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#202c33] rounded-xl p-6 w-96 border border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Delete Document</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete "<span className="font-medium">{document.title}</span>"? 
              This will permanently remove the document and all its content.
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteDocument();
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
