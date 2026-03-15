import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api/client'

export default function Dashboard() {
  const { user, driver } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [vData, sData] = await Promise.all([
        api.listVehicles().catch(() => ({ vehicles: [] })),
        api.getAvailableShipments().catch(() => ({ shipments: [] })),
      ])
      setVehicles(vData.vehicles || [])
      setShipments(sData.shipments || [])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-500">Loading dashboard...</div>
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="My Vehicles" value={vehicles.length} icon="🚚" color="bg-blue-50 text-blue-700" />
        <StatCard label="Available Shipments" value={shipments.length} icon="📦" color="bg-green-50 text-green-700" />
        <StatCard label="Rating" value={driver?.rating?.toFixed(1) || 'N/A'} icon="⭐" color="bg-yellow-50 text-yellow-700" />
        <StatCard label="Status" value={driver?.is_active ? 'Active' : 'Inactive'} icon="🟢" color="bg-purple-50 text-purple-700" />
      </div>

      {/* Recent Available Shipments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Available Shipments</h3>
        {shipments.length === 0 ? (
          <p className="text-gray-500">No shipments available right now.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Route</th>
                  <th className="pb-3 font-medium">Load</th>
                  <th className="pb-3 font-medium">Weight</th>
                  <th className="pb-3 font-medium">Temp</th>
                  <th className="pb-3 font-medium">Est. Cost</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 5).map((s) => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3">{s.source_location} → {s.destination_location}</td>
                    <td className="py-3">{s.load_type}</td>
                    <td className="py-3">{s.load_weight} kg</td>
                    <td className="py-3">{s.required_temp === -1 ? 'Ambient' : s.required_temp + '°C'}</td>
                    <td className="py-3 font-medium">₹{s.estimated_cost?.toFixed(0) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* My Vehicles */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">My Vehicles</h3>
        {vehicles.length === 0 ? (
          <p className="text-gray-500">No vehicles registered. Add one from the Vehicles page.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vehicles.map((v) => (
              <div key={v.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{v.manufacturer} {v.model}</p>
                    <p className="text-sm text-gray-500">{v.license_plate}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${v.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {v.is_available ? 'Available' : 'Busy'}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <span>{v.capacity} m³</span> · <span>{v.max_weight} kg</span>
                  {v.is_refrigerated && <span> · ❄️ {v.temperature}°C</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-70">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  )
}
