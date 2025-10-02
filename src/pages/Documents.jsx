import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Documents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDocuments();
      setupRealtimeSubscription();
    }
  }, [user, sortBy, sortOrder]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('documents-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `user_id=eq.${user.id}`
      }, () => {
        fetchDocuments();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  };

  const createNewDocument = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: 'Untitled Document',
          content: '',
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/app/documents/${data.id}`);
    } catch (error) {
      console.error('Error creating document:', error);
    }
  };

  const deleteDocuments = async (docIds) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .in('id', docIds);

      if (error) throw error;
      setSelectedDocs([]);
      setShowDeleteModal(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting documents:', error);
    }
  };

  const duplicateDocument = async (doc) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: `${doc.title} (Copy)`,
          content: doc.content,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      fetchDocuments();
    } catch (error) {
      console.error('Error duplicating document:', error);
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const getWordCount = (content) => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading documents...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Documents</h1>
          <p className="text-gray-400">Create and manage your documents</p>
        </div>
        <button
          onClick={createNewDocument}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Document
        </button>
      </div>

      {/* Search and Controls */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
          
          {selectedDocs.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">{selectedDocs.length} selected</span>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sort Controls */}
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="updated_at-desc">Last Modified</option>
            <option value="created_at-desc">Date Created</option>
            <option value="title-asc">Name A-Z</option>
            <option value="title-desc">Name Z-A</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Documents Grid/List */}
      {filteredDocuments.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-white mb-2">No documents found</h3>
          <p className="text-gray-400 mb-6">
            {searchTerm ? 'Try adjusting your search terms' : 'Create your first document to get started'}
          </p>
          {!searchTerm && (
            <button
              onClick={createNewDocument}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Create Document
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'space-y-2'}>
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className={`group ${
                viewMode === 'grid' 
                  ? 'bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer'
                  : 'bg-gray-800/30 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-200 cursor-pointer'
              }`}
            >
              {viewMode === 'grid' ? (
                <div onClick={() => navigate(`/app/documents/${doc.id}`)} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        type="checkbox"
                        checked={selectedDocs.includes(doc.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedDocs([...selectedDocs, doc.id]);
                          } else {
                            setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateDocument(doc);
                        }}
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                        title="Duplicate"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDocs([doc.id]);
                          setShowDeleteModal(true);
                        }}
                        className="p-1 hover:bg-gray-700 rounded text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="font-medium text-white mb-2 truncate" title={doc.title}>
                    {doc.title}
                  </h3>
                  
                  <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                    {doc.content || 'No content'}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{getWordCount(doc.content)} words</span>
                    <span>{formatDate(doc.updated_at)}</span>
                  </div>
                </div>
              ) : (
                <div onClick={() => navigate(`/app/documents/${doc.id}`)} className="flex items-center gap-4 p-4">
                  <input
                    type="checkbox"
                    checked={selectedDocs.includes(doc.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (e.target.checked) {
                        setSelectedDocs([...selectedDocs, doc.id]);
                      } else {
                        setSelectedDocs(selectedDocs.filter(id => id !== doc.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  
                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-white truncate">{doc.title}</h3>
                    <p className="text-sm text-gray-400 truncate">{doc.content || 'No content'}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 flex-shrink-0">
                    <span>{getWordCount(doc.content)} words</span>
                    <span>{formatDate(doc.updated_at)}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateDocument(doc);
                      }}
                      className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocs([doc.id]);
                        setShowDeleteModal(true);
                      }}
                      className="p-1 hover:bg-gray-700 rounded text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[#202c33] rounded-xl p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">Delete Documents</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to delete {selectedDocs.length} document{selectedDocs.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteDocuments(selectedDocs)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
