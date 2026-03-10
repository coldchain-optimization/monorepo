import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Driver, Vehicle } from '../types';
import { UserCheck, ChevronDown, ChevronUp, Star } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [driverVehicles, setDriverVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  useEffect(() => {
    api
      .getAllDrivers()
      .then((data) => setDrivers(Array.isArray(data) ? data : []))
      .catch(() => setDrivers([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (driverId: string) => {
    if (expanded === driverId) {
      setExpanded(null);
      return;
    }
    setExpanded(driverId);
    setVehiclesLoading(true);
    try {
      const data = await api.getDriverVehicles(driverId);
      setDriverVehicles(Array.isArray(data) ? data : []);
    } catch {
      setDriverVehicles([]);
    } finally {
      setVehiclesLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <UserCheck className="h-7 w-7 text-blue-600" />
          Drivers
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {drivers.length} registered drivers
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr className="text-left text-slate-500">
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-6 py-3 font-medium">License</th>
              <th className="px-6 py-3 font-medium">Phone</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3 font-medium">Rating</th>
              <th className="px-6 py-3 font-medium">Active</th>
              <th className="px-6 py-3 font-medium">Vehicles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {drivers.map((d) => (
              <>
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {d.id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-4">{d.license_number}</td>
                  <td className="px-6 py-4">{d.phone_number}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        d.role === 'transporting_body'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-violet-100 text-violet-700'
                      }`}
                    >
                      {d.role === 'transporting_body' ? 'T-body' : 'H-body'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      {d.rating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`h-2.5 w-2.5 rounded-full inline-block ${
                        d.is_active ? 'bg-emerald-400' : 'bg-slate-300'
                      }`}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleExpand(d.id)}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs font-medium"
                    >
                      {expanded === d.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      View
                    </button>
                  </td>
                </tr>
                {expanded === d.id && (
                  <tr key={`${d.id}-vehicles`}>
                    <td colSpan={7} className="px-6 py-4 bg-slate-50">
                      {vehiclesLoading ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                        </div>
                      ) : driverVehicles.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Vehicles
                          </p>
                          {driverVehicles.map((v) => (
                            <div
                              key={v.id}
                              className="flex items-center gap-4 bg-white rounded-lg border border-slate-200 px-4 py-2 text-sm"
                            >
                              <span className="font-medium">
                                {v.manufacturer} {v.model}
                              </span>
                              <span className="text-slate-500">
                                {v.license_plate}
                              </span>
                              <span className="text-slate-400">
                                {v.vehicle_type}
                              </span>
                              <span
                                className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${
                                  v.is_available
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {v.is_available ? 'Available' : 'Unavailable'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 text-center">
                          No vehicles registered
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {drivers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  No drivers found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
