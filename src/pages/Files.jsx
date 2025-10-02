

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';


export default function Files() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  // Fetch files from Supabase bucket for this user
  const fetchFiles = async () => {
    if (!user) return;
    // List files in user's folder in the bucket
    const { data, error } = await supabase.storage.from('files').list(user.id + '/', { limit: 100, offset: 0 });
    if (!error) setFiles(data || []);
  };

  useEffect(() => {
    fetchFiles();
    // Optionally, subscribe to storage changes if needed
    // (Supabase Storage does not support realtime yet)
    // So we just refetch on upload
    // eslint-disable-next-line
  }, [user]);

  // Handle file upload
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploading(true);
    const filePath = `${user.id}/${file.name}`;
    const { error } = await supabase.storage.from('files').upload(filePath, file, { upsert: true });
    setUploading(false);
    if (!error) {
      fetchFiles();
    } else {
      alert('Upload failed: ' + error.message);
    }
  };


  // Copy file public URL to clipboard
  const handleCopyUrl = async (fileName) => {
    const filePath = `${user.id}/${fileName}`;
    const { data } = supabase.storage.from('files').getPublicUrl(filePath);
    if (data?.publicUrl) {
      await navigator.clipboard.writeText(data.publicUrl);
      alert('URL copied!');
    }
  };

  // Open file in new tab
  const handleOpenFile = (fileName) => {
    const filePath = `${user.id}/${fileName}`;
    const { data } = supabase.storage.from('files').getPublicUrl(filePath);
    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    }
  };

  // Delete file from Supabase bucket
  const handleDeleteFile = async (fileName) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    const filePath = `${user.id}/${fileName}`;
    const { error } = await supabase.storage.from('files').remove([filePath]);
    if (!error) {
      fetchFiles();
    } else {
      alert('Delete failed: ' + error.message);
    }
  };

  // Open user's folder in Supabase Storage UI (optional, or just show files)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Files</h1>
        <div className="flex gap-2">
          {/* Remove New button, keep only Upload */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleUpload}
            multiple={false}
          />
          <button
            className="bg-gray-800 hover:bg-gray-700 rounded-md px-3 py-1.5 text-sm"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            disabled={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
      <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs text-gray-400 border-b border-gray-800">
          <div className="col-span-8">Name</div>
          <div className="col-span-2">Size</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        <div className="divide-y divide-gray-800">
          {files.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-500">No files found.</div>
          )}
          {files.map((f) => (
            <div key={f.id || f.name} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
              <div className="col-span-8 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center">
                  <span role="img" aria-label="file">📄</span>
                </div>
                <span>{f.name}</span>
              </div>
              <div className="col-span-2 text-gray-400">{f.metadata?.size || f.metadata?.file_size || '-'}</div>
              <div className="col-span-2 text-right flex gap-2 justify-end">
                <button
                  className="text-xs bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
                  onClick={() => handleOpenFile(f.name)}
                >Open</button>
                <button
                  className="text-xs bg-gray-800 hover:bg-gray-700 rounded px-2 py-1"
                  onClick={() => handleCopyUrl(f.name)}
                >Copy URL</button>
                <button
                  className="text-xs bg-red-700 hover:bg-red-800 rounded px-2 py-1"
                  onClick={() => handleDeleteFile(f.name)}
                >Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
