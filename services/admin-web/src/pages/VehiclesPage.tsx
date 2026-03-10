import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Vehicle } from '../types';
import { Truck, Snowflake, Fuel } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAllVehicles()
      .then((data) => setVehicles(Array.isArray(data) ? data : []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

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
          <Truck className="h-7 w-7 text-blue-600" />
          Vehicles
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {vehicles.length} total vehicles
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {v.manufacturer} {v.model}
                </p>
                <p className="text-sm text-slate-500">{v.vehicle_type}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  v.is_available
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {v.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
              <div>
                <span className="text-slate-400">Plate:</span> {v.license_plate}
              </div>
              <div>
                <span className="text-slate-400">Year:</span> {v.year}
              </div>
              <div>
                <span className="text-slate-400">Capacity:</span>{' '}
                {v.capacity} m³
              </div>
              <div>
                <span className="text-slate-400">Max Weight:</span>{' '}
                {v.max_weight} kg
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              {v.is_refrigerated && (
                <span className="inline-flex items-center gap-1 text-blue-600">
                  <Snowflake className="h-4 w-4" />
                  {v.temperature}°C
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-slate-500">
                <Fuel className="h-4 w-4" />
                {v.fuel_type}
              </span>
              <span className="text-slate-400 text-xs ml-auto">
                CO₂: {v.carbon_footprint} g/km
              </span>
            </div>

            {v.current_location && (
              <p className="text-xs text-slate-400 truncate">
                📍 {v.current_location}
              </p>
            )}
          </div>
        ))}

        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400">
            No vehicles registered yet
          </div>
        )}
      </div>
    </div>
  );
}
