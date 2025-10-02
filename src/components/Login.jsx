import { useState } from 'react';
export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#111b21]">
      <div className="bg-[#202c33] p-8 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-4 text-white">Join Chat</h1>
        <input
          className="mb-4 px-4 py-2 rounded w-64 bg-gray-800 text-white"
          placeholder="Enter username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <button
          className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded"
          onClick={() => username && onLogin(username)}
        >
          Join
        </button>
      </div>
    </div>
  );
}
