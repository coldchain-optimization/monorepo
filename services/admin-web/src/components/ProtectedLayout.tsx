import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Sidebar } from "./Sidebar";

export function ProtectedLayout() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1117]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (user.role !== "admin") {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1117] p-6">
        <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-6 max-w-md text-center">
          <h2 className="text-lg font-semibold text-white">
            Admin Access Required
          </h2>
          <p className="text-sm text-gray-400 mt-2">
            This account does not have admin permissions.
          </p>
          <button
            onClick={logout}
            className="mt-4 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0F1117]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
