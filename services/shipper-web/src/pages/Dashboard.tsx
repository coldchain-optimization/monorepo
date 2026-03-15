import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-indigo-900 text-white p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">LoopLink Driver</h1>
        <div className="flex items-center gap-4">
          <span>Welcome, {user?.first_name}!</span>
          <button
            onClick={handleLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="p-8">
        <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-600">Hello {user?.email}, welcome to your driver dashboard!</p>
          <p className="text-gray-600 mt-4">Features coming soon:</p>
          <ul className="list-disc list-inside mt-2 text-gray-600">
            <li>View available shipments</li>
            <li>Consolidation opportunities</li>
            <li>Backhauling options</li>
            <li>Trip management</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
