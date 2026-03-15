import { useState, useEffect } from 'react'
import { api } from '../api/client'

export default function Backhauling() {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedShipment, setSelectedShipment] = useState(null)
  const [backhaulData, setBackhaulData] = useState(null)
  const [backhaulLoading, setBackhaulLoading] = useState(false)
  const [consolidation, setConsolidation] = useState(null)
  const [consolLoading, setConsolLoading] = useState(false)

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

  const findBackhauling = async (shipmentId) => {
    setSelectedShipment(shipmentId)
    setBackhaulData(null)
    setConsolidation(null)
    setBackhaulLoading(true)
    try {
      const data = await api.getBackhauling(shipmentId)
      setBackhaulData(data)
    } catch (err) {
      alert('Backhauling search failed: ' + err.message)
    } finally {
      setBackhaulLoading(false)
    }
  }

  const findConsolidation = async (shipmentId) => {
    setConsolLoading(true)
    try {
      const data = await api.getConsolidationOpportunities(shipmentId)
      setConsolidation(data)
    } catch (err) {
      alert('Consolidation search failed: ' + err.message)
    } finally {
      setConsolLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Backhauling & Consolidation</h2>

      {/* Shipment Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Select a Shipment</h3>
        {shipments.length === 0 ? (
          <p className="text-gray-500">No shipments available.</p>
        ) : (
          <div className="space-y-2">
            {shipments.map((s) => (
              <div key={s.id}
                className={`border rounded-lg p-4 cursor-pointer transition hover:border-indigo-400 ${selectedShipment === s.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'}`}
                onClick={() => { findBackhauling(s.id); findConsolidation(s.id) }}>
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{s.source_location} → {s.destination_location}</p>
                    <p className="text-sm text-gray-500">{s.load_type} · {s.load_weight} kg</p>
                  </div>
                  <p className="text-sm text-indigo-600 font-medium">₹{s.estimated_cost?.toFixed(0) || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedShipment && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backhauling Results */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">↩️ Backhauling Opportunities</h3>
            {backhaulLoading ? (
              <p className="text-gray-500">Searching...</p>
            ) : !backhaulData || !backhaulData.opportunities || backhaulData.opportunities.length === 0 ? (
              <p className="text-gray-500">No backhauling opportunities found.</p>
            ) : (
              <div className="space-y-3">
                {backhaulData.opportunities.map((opp, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium">{opp.source_location || opp.from} → {opp.destination_location || opp.to}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {opp.load_type} · {opp.load_weight} kg
                    </p>
                    {opp.bonus_money && (
                      <p className="text-green-600 font-medium mt-1">+₹{opp.bonus_money} bonus</p>
                    )}
                    {opp.detour_km && (
                      <p className="text-xs text-gray-400">Detour: {opp.detour_km} km</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Consolidation Results */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">📦 Consolidation Opportunities</h3>
            {consolLoading ? (
              <p className="text-gray-500">Searching...</p>
            ) : !consolidation || !consolidation.opportunities || consolidation.opportunities.length === 0 ? (
              <p className="text-gray-500">No consolidation opportunities found.</p>
            ) : (
              <div className="space-y-3">
                {consolidation.opportunities.map((opp, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{opp.shipment_count || opp.shipments?.length || 0} shipments</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Savings: <span className="text-green-600 font-medium">₹{opp.estimated_savings?.toFixed(0) || opp.savings?.toFixed(0) || '—'}</span>
                        </p>
                      </div>
                      {opp.feasibility && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          opp.feasibility === 'confirmed' ? 'bg-green-100 text-green-700' :
                          opp.feasibility === 'likely' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {opp.feasibility}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
