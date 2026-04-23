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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Truck className="h-7 w-7 text-violet-400" />
          Vehicles
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {vehicles.length} total vehicles
        </p>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">
                  {v.manufacturer} {v.model}
                </p>
                <p className="text-sm text-gray-400">{v.vehicle_type}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  v.is_available
                    ? 'bg-emerald-100 text-emerald-400'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {v.is_available ? 'Available' : 'Unavailable'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
              <div>
                <span className="text-gray-400">Plate:</span> {v.license_plate}
              </div>
              <div>
                <span className="text-gray-400">Year:</span> {v.year}
              </div>
              <div>
                <span className="text-gray-400">Capacity:</span>{' '}
                {v.capacity} m³
              </div>
              <div>
                <span className="text-gray-400">Max Weight:</span>{' '}
                {v.max_weight} kg
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              {v.is_refrigerated && (
                <span className="inline-flex items-center gap-1 text-violet-400">
                  <Snowflake className="h-4 w-4" />
                  {v.temperature}°C
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-gray-400">
                <Fuel className="h-4 w-4" />
                {v.fuel_type}
              </span>
              <span className="text-gray-400 text-xs ml-auto">
                CO₂: {v.carbon_footprint} g/km
              </span>
            </div>

            {v.current_location && (
              <p className="text-xs text-gray-400 truncate">
                📍 {v.current_location}
              </p>
            )}
          </div>
        ))}

        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            No vehicles registered yet
          </div>
        )}
      </div>
    </div>
  );
}
