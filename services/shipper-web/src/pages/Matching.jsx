import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Matching() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [matches, setMatches] = useState([])
  const [matchLoading, setMatchLoading] = useState(false)
  const [acceptMsg, setAcceptMsg] = useState('')

  useEffect(() => {
    loadShipments()
  }, [])

  const loadShipments = async () => {
    try {
      const data = await api.getAvailableShipments()
      setShipments(data.shipments || [])
    } catch {
      setShipments([])
    } finally {
      setLoading(false)
    }
  }

  const searchMatches = async (shipmentId) => {
    setSelectedShipment(shipmentId)
    setMatches([])
    setMatchLoading(true)
    setAcceptMsg('')
    try {
      const data = await api.searchMatches(shipmentId)
      setMatches(data.matches || [])
    } catch (err) {
      alert('Failed to search matches: ' + err.message)
    } finally {
      setMatchLoading(false)
    }
  }

  const acceptMatch = async (match) => {
    try {
      await api.acceptMatch({
        shipment_id: selectedShipment,
        vehicle_id: match.vehicle_id,
        driver_id: match.driver_id,
        match_score: match.match_score,
        estimated_cost: match.estimated_cost,
      })
      setAcceptMsg('Match accepted! Shipment booked successfully.')
      loadShipments()
    } catch (err) {
      alert('Failed to accept: ' + err.message)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading shipments...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Find Shipments</h2>

      {acceptMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">{acceptMsg}</div>
      )}

      {/* Available Shipments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Available Shipments</h3>
        {shipments.length === 0 ? (
          <p className="text-gray-500">No shipments available.</p>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => (
              <div key={s.id}
                className={`border rounded-lg p-4 cursor-pointer transition hover:border-indigo-400 ${selectedShipment === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                onClick={() => searchMatches(s.id)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{s.source_location} → {s.destination_location}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {s.load_type} · {s.load_weight} kg · {s.load_volume} m³
                      {s.required_temp !== -1 && ` · ❄️ ${s.required_temp}°C`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-indigo-600">₹{s.estimated_cost?.toFixed(0) || '—'}</p>
                    <p className="text-xs text-gray-400">{s.days_available} days available</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match Results */}
      {selectedShipment && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Match Results</h3>
          {matchLoading ? (
            <p className="text-gray-500">Searching for best matches...</p>
          ) : matches.length === 0 ? (
            <p className="text-gray-500">No matches found for this shipment.</p>
          ) : (
            <div className="space-y-3">
              {matches.map((m, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-bold text-indigo-600">{m.match_score?.toFixed(1)}%</span>
                        <span className="text-sm text-gray-500">Match Score</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Vehicle: {m.vehicle_id?.slice(0, 8)}... · Driver: {m.driver_id?.slice(0, 8)}...
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        Est. Time: {m.estimated_time} min · CO₂: {m.carbon_footprint?.toFixed(2)} kg
                      </p>
                      {m.reasons && m.reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {m.reasons.map((r, j) => (
                            <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{r}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">₹{m.estimated_cost?.toFixed(0)}</p>
                      <button onClick={() => acceptMatch(m)}
                        className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition">
                        Accept
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
