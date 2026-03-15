import { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Package,
  Truck,
  Users,
  UserCheck,
  TrendingUp,
  Activity,
} from 'lucide-react';
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
} from 'recharts';
import type { Shipment, Vehicle } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-start gap-4">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStats().catch(() => ({})),
      api.getAllShipments().catch(() => []),
      api.getAllVehicles().catch(() => []),
    ]).then(([s, sh, v]) => {
      setStats(s);
      setShipments(Array.isArray(sh) ? sh : []);
      setVehicles(Array.isArray(v) ? v : []);
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
    ([name, count]) => ({ name, count })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Cold-chain logistics overview
        </p>
      </div>

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
          value={shipments.filter((s) => s.status === 'booked').length}
          icon={Activity}
          color="bg-cyan-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipment statuses */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
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
                    <Cell
                      key={idx}
                      fill={COLORS[idx % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center py-16">
              No shipment data yet
            </p>
          )}
        </div>

        {/* Vehicle types */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Vehicle Types
          </h2>
          {vehicleChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={vehicleChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-sm text-center py-16">
              No vehicle data yet
            </p>
          )}
        </div>
      </div>

      {/* Recent shipments table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">
          Recent Shipments
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="pb-3 font-medium">ID</th>
                <th className="pb-3 font-medium">From</th>
                <th className="pb-3 font-medium">To</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Weight</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shipments.slice(0, 10).map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 font-mono text-xs text-slate-500">
                    {s.id.slice(0, 8)}…
                  </td>
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
                  <td colSpan={6} className="py-8 text-center text-slate-400">
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
    pending: 'bg-amber-100 text-amber-700',
    booked: 'bg-blue-100 text-blue-700',
    in_transit: 'bg-violet-100 text-violet-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        colors[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
