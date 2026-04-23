import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Package,
  Truck,
  Users,
  UserCheck,
  Brain,
  LogOut,
  Snowflake,
} from "lucide-react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/shipments", label: "Shipments", icon: Package },
  { to: "/vehicles", label: "Vehicles", icon: Truck },
  { to: "/drivers", label: "Drivers", icon: UserCheck },
  { to: "/users", label: "Users", icon: Users },
  { to: "/knowledge-base", label: "Knowledge Base", icon: Brain },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="w-full bg-[#0F1117]/80 shadow-sm border-b border-white/10 backdrop-blur-md flex items-center justify-between px-4 py-2 shrink-0">
      <div className="flex items-center gap-8">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <Snowflake className="h-7 w-7 text-violet-400" />
          <span className="text-lg font-bold text-white">LoopLink</span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-2">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-violet-300"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User section */}
      <div className="flex items-center gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-white">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-xs text-gray-400">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-500/20 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
