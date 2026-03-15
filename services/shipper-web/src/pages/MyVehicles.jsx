import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function MyVehicles() {
  const { driver } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    vehicle_type: 'medium',
    license_plate: '',
    manufacturer: '',
    model: '',
    year: 2024,
    capacity: 20,
    max_weight: 10000,
    fuel_type: 'diesel',
    is_refrigerated: false,
    temperature: 0,
    carbon_footprint: 0.15,
    current_location: '',
  })

  useEffect(() => {
    loadVehicles()
  }, [])

  const loadVehicles = async () => {
    try {
      const data = await api.listVehicles()
      setVehicles(data.vehicles || [])
    } catch {
      setVehicles([])
    } finally {
      setLoading(false)
    }
  }

  const set = (key, val) => setForm({ ...form, [key]: val })

  const handleCreate = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const payload = {
        ...form,
        driver_id: driver?.id || '',
        year: parseInt(form.year),
        capacity: parseInt(form.capacity),
        max_weight: parseInt(form.max_weight),
        temperature: form.is_refrigerated ? parseInt(form.temperature) : 0,
        carbon_footprint: parseFloat(form.carbon_footprint),
      }
      await api.createVehicle(payload)
      setShowForm(false)
      setForm({ ...form, license_plate: '', manufacturer: '', model: '', current_location: '' })
      loadVehicles()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this vehicle?')) return
    try {
      await api.deleteVehicle(id)
      loadVehicles()
    } catch (err) {
      alert(err.message)
    }
  }

  const toggleAvailability = async (v) => {
    try {
      await api.updateVehicle(v.id, { is_available: !v.is_available })
      loadVehicles()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading vehicles...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Vehicles</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {showForm ? 'Cancel' : '+ Add Vehicle'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Register New Vehicle</h3>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="refrigerated">Refrigerated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
              <input value={form.license_plate} onChange={(e) => set('license_plate', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="MH-12-AB-1234" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input value={form.manufacturer} onChange={(e) => set('manufacturer', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Tata" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input value={form.model} onChange={(e) => set('model', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Ace Gold" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input type="number" value={form.year} onChange={(e) => set('year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (m³)</label>
              <input type="number" value={form.capacity} onChange={(e) => set('capacity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Weight (kg)</label>
              <input type="number" value={form.max_weight} onChange={(e) => set('max_weight', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
              <select value={form.fuel_type} onChange={(e) => set('fuel_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="diesel">Diesel</option>
                <option value="petrol">Petrol</option>
                <option value="cng">CNG</option>
                <option value="electric">Electric</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Location</label>
              <input value={form.current_location} onChange={(e) => set('current_location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Nashik" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.is_refrigerated}
                  onChange={(e) => set('is_refrigerated', e.target.checked)} className="rounded" />
                <span className="text-sm text-gray-700">Refrigerated</span>
              </label>
              {form.is_refrigerated && (
                <input type="number" value={form.temperature} onChange={(e) => set('temperature', e.target.value)}
                  placeholder="Temp °C" className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              )}
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition">
                Register Vehicle
              </button>
            </div>
          </form>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-500 text-lg">No vehicles registered yet.</p>
          <p className="text-gray-400 mt-2">Click "Add Vehicle" to register your first vehicle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vehicles.map((v) => (
            <div key={v.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{v.manufacturer} {v.model}</h4>
                  <p className="text-sm text-gray-500">{v.license_plate} · {v.year}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${v.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {v.is_available ? 'Available' : 'Busy'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm text-gray-600 mb-4">
                <div><span className="text-gray-400">Type:</span> {v.vehicle_type}</div>
                <div><span className="text-gray-400">Capacity:</span> {v.capacity} m³</div>
                <div><span className="text-gray-400">Max:</span> {v.max_weight} kg</div>
                <div><span className="text-gray-400">Fuel:</span> {v.fuel_type}</div>
                <div><span className="text-gray-400">Location:</span> {v.current_location || '—'}</div>
                {v.is_refrigerated && <div>❄️ {v.temperature}°C</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleAvailability(v)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${v.is_available ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {v.is_available ? 'Set Busy' : 'Set Available'}
                </button>
                <button onClick={() => handleDelete(v.id)}
                  className="px-3 py-1 rounded-lg text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 transition">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
