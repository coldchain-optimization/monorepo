import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Vehicle } from '../types';

export function MyVehicles() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    licensePlate: '',
    vehicleType: 'delivery',
    capacity: '1000',
    temperatureMin: '0',
    temperatureMax: '35',
    currentLocation: 'New Delhi',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchVehicles();
  }, [user, navigate]);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDriverVehicles();
      setVehicles(Array.isArray(data) ? data : [data]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicles');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await apiClient.createVehicle({
        license_plate: formData.licensePlate,
        vehicle_type: formData.vehicleType,
        capacity: parseInt(formData.capacity),
        temperature_min: parseInt(formData.temperatureMin),
        temperature_max: parseInt(formData.temperatureMax),
        current_location: formData.currentLocation,
      });

      setShowForm(false);
      setFormData({
        licensePlate: '',
        vehicleType: 'delivery',
        capacity: '1000',
        temperatureMin: '0',
        temperatureMax: '35',
        currentLocation: 'New Delhi',
      });
      await fetchVehicles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create vehicle');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-600">Loading vehicles...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900">My Vehicles</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
        >
          {showForm ? 'Cancel' : '+ Add Vehicle'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Vehicle</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Plate
                </label>
                <input
                  type="text"
                  name="licensePlate"
                  value={formData.licensePlate}
                  onChange={handleChange}
                  placeholder="DL01AB1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="delivery">Delivery Van</option>
                  <option value="refrigerated">Refrigerated Truck</option>
                  <option value="tanker">Tanker</option>
                  <option value="flatbed">Flatbed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity (kg)
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Location
                </label>
                <input
                  type="text"
                  name="currentLocation"
                  value={formData.currentLocation}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Temperature (°C)
                </label>
                <input
                  type="number"
                  name="temperatureMin"
                  value={formData.temperatureMin}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Temperature (°C)
                </label>
                <input
                  type="number"
                  name="temperatureMax"
                  value={formData.temperatureMax}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition"
            >
              {saving ? 'Adding Vehicle...' : 'Add Vehicle'}
            </button>
          </form>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No vehicles registered yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Add Your First Vehicle
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {vehicles.map((vehicle) => (
            <div key={vehicle.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {vehicle.license_plate}
                  </h3>
                  <p className="text-gray-600">{vehicle.vehicle_type}</p>
                </div>
                <span className="text-lg font-bold text-indigo-600">
                  {vehicle.capacity}kg
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-gray-600 text-sm">Location</p>
                  <p className="font-semibold">{vehicle.current_location}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Temperature Range</p>
                  <p className="font-semibold">
                    {vehicle.temperature_min}°C - {vehicle.temperature_max}°C
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <p className="font-semibold text-green-600">Active</p>
                </div>
              </div>

              <button className="text-indigo-600 hover:underline text-sm">
                Edit Details →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
