import { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const menuItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'My Profile', path: '/profile', icon: '👤' },
    { label: 'My Vehicles', path: '/vehicles', icon: '🚚' },
    { label: 'Find Shipments', path: '/matching', icon: '📦' },
    { label: 'Backhauling', path: '/backhauling', icon: '↩️' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-indigo-900 text-white flex flex-col">
        <div className="p-6 border-b border-indigo-800">
          <h1 className="text-2xl font-bold">LoopLink Driver</h1>
          <p className="text-indigo-200 text-sm mt-1">{user?.email}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full text-left px-4 py-3 rounded-lg transition ${
                location.pathname === item.path
                  ? 'bg-indigo-700 font-semibold'
                  : 'hover:bg-indigo-800'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-indigo-800 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-lg bg-red-600 hover:bg-red-700 transition font-semibold"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {menuItems.find((m) => m.path === location.pathname)?.label ||
                'Dashboard'}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Welcome back, {user?.first_name}!</p>
          </div>
        </div>

        {/* Page Content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
