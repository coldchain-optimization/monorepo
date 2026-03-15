import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { label: 'Dashboard', path: '/dashboard', icon: '📊' },
  { label: 'My Profile', path: '/profile', icon: '👤' },
  { label: 'My Vehicles', path: '/vehicles', icon: '🚚' },
  { label: 'Find Shipments', path: '/matching', icon: '📦' },
  { label: 'Backhauling', path: '/backhauling', icon: '↩️' },
]

export default function MainLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-6 border-b border-indigo-800">
          <h1 className="text-xl font-bold">🚚 LoopLink</h1>
          <p className="text-indigo-300 text-sm mt-1">{user?.email}</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                location.pathname === item.path
                  ? 'bg-indigo-700 font-semibold'
                  : 'hover:bg-indigo-800'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition font-medium text-sm"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">
            {menuItems.find((m) => m.path === location.pathname)?.label || 'LoopLink'}
          </h2>
          <p className="text-sm text-gray-500">
            Welcome, {user?.first_name || 'Driver'}!
          </p>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
