import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  Package,
  Truck,
  Users,
  UserCheck,
  TrendingUp,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Shipment, Vehicle } from "../types";

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-6 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    Promise.allSettled([
      api.getStats().catch(() => ({})),
      api.getAllShipments().catch(() => []),
      api.getAllVehicles().catch(() => []),
    ]).then(([statsResult, shipmentsResult, vehiclesResult]) => {
      if (statsResult.status === "rejected")
        setError("Failed to load admin stats");
      if (shipmentsResult.status === "rejected")
        setError("Failed to load shipments");
      if (vehiclesResult.status === "rejected")
        setError("Failed to load vehicles");

      setStats(statsResult.status === "fulfilled" ? statsResult.value : {});
      setShipments(
        shipmentsResult.status === "fulfilled" &&
          Array.isArray(shipmentsResult.value)
          ? shipmentsResult.value
          : [],
      );
      setVehicles(
        vehiclesResult.status === "fulfilled" &&
          Array.isArray(vehiclesResult.value)
          ? vehiclesResult.value
          : [],
      );
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Build chart data
  const statusCounts: Record<string, number> = {};
  shipments.forEach((s) => {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
  });
  const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
  }));

  const vehicleTypesCounts: Record<string, number> = {};
  vehicles.forEach((v) => {
    vehicleTypesCounts[v.vehicle_type] =
      (vehicleTypesCounts[v.vehicle_type] || 0) + 1;
  });
  const vehicleChartData = Object.entries(vehicleTypesCounts).map(
    ([name, count]) => ({ name, count }),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">
          Cold-chain logistics overview
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}. Check backend on `http://localhost:8080/api/v1` and admin
          login.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          label="Total Drivers"
          value={stats.total_drivers ?? 0}
          icon={Users}
          color="bg-blue-500"
        />
        <StatCard
          label="Pending Shipments"
          value={stats.pending_shipments ?? 0}
          icon={UserCheck}
          color="bg-emerald-500"
        />
        <StatCard
          label="Available Vehicles"
          value={stats.available_vehicles ?? 0}
          icon={UserCheck}
          color="bg-violet-500"
        />
        <StatCard
          label="Total Shipments"
          value={shipments.length}
          icon={Package}
          color="bg-amber-500"
        />
        <StatCard
          label="Total Vehicles"
          value={vehicles.length}
          icon={Truck}
          color="bg-rose-500"
        />
        <StatCard
          label="Booked Shipments"
          value={shipments.filter((s) => s.status === "booked").length}
          icon={Activity}
          color="bg-cyan-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipment statuses */}
        <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-violet-400" />
            Shipment Statuses
          </h2>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusChartData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">
              No shipment data yet
            </p>
          )}
        </div>

        {/* Vehicle types */}
        <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-violet-400" />
            Vehicle Types
          </h2>
          {vehicleChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={vehicleChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-sm text-center py-16">
              No vehicle data yet
            </p>
          )}
        </div>
      </div>

      {/* Recent shipments table */}
      <div className="bg-white/5 rounded-xl border border-white/10 backdrop-blur-md p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Recent Shipments
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-400 border-b border-white/10">
                <th className="pb-3 font-medium">From</th>
                <th className="pb-3 font-medium">To</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Weight</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {shipments.slice(0, 10).map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="py-3">{s.source_location}</td>
                  <td className="py-3">{s.destination_location}</td>
                  <td className="py-3">{s.load_type}</td>
                  <td className="py-3">{s.load_weight} kg</td>
                  <td className="py-3">
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No shipments yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-400",
    booked: "bg-blue-500/20 text-blue-400",
    in_transit: "bg-violet-500/20 text-violet-400",
    delivered: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-red-500/20 text-red-400",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        colors[status] || "bg-white/10 text-gray-300"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
