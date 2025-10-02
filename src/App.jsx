import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import Activity from './pages/Activity.jsx'
import Chat from './pages/Chat.jsx'
import Teams from './pages/Teams.jsx'
import Calendar from './pages/Calendar.jsx'
import Files from './pages/Files.jsx'
import Tasks from './pages/Tasks.jsx'
import Documents from './pages/Documents.jsx'
import DocumentEditor from './pages/DocumentEditor.jsx'
import Whiteboard from './pages/Whiteboard.jsx'
import VoiceChat from './pages/VoiceChat.jsx'
import UnifiedVoice from './pages/UnifiedVoice.jsx'
import HomePage from './pages/HomePage.jsx'
import AboutProject from './pages/AboutProject.jsx'
import Meetings from './pages/Meetings.jsx'
import VideoConferenceRoom from './pages/VideoConferenceRoom.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected app routes */}
        <Route element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          {/* Remove forced redirect so user stays on current page after refresh */}
          <Route path="/app/home" element={<HomePage />} />
          <Route path="/app/activity" element={<Activity />} />
          <Route path="/app/chat" element={<Chat />} />
          <Route path="/app/teams" element={<Teams />} />
          <Route path="/app/calendar" element={<Calendar />} />
          <Route path="/app/files" element={<Files />} />
          <Route path="/app/tasks" element={<Tasks />} />
          <Route path="/app/documents" element={<Documents />} />
          <Route path="/app/documents/:documentId" element={<DocumentEditor />} />
          <Route path="/app/whiteboard" element={<Whiteboard />} />
          <Route path="/app/voice-chat/:channelId" element={<VoiceChat />} />
          <Route path="/app/voice" element={<UnifiedVoice />} />
          <Route path="/app/meetings" element={<Meetings />} />
          <Route path="/app/about" element={<AboutProject />} />
        </Route>
        
        {/* Video Conference Route (full screen, outside AppLayout) */}
        <Route path="/meet/:meetingId" element={
          <ProtectedRoute>
            <VideoConferenceRoom />
          </ProtectedRoute>
        } />
      </Routes>
    </AuthProvider>
  )
}
