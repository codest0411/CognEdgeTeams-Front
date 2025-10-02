import Sidebar from '../components/Sidebar.jsx'
import Topbar from '../components/Topbar.jsx'
import { Outlet } from 'react-router-dom'

export default function AppLayout() {
  return (
    <div className="h-screen w-screen bg-gray-900 text-gray-100 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
