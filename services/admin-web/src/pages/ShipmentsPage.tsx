import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Shipment, MatchResult, Driver, Vehicle } from '../types';
import { Package, Search, X, Zap, CheckCircle } from 'lucide-react';

export default function ShipmentsPage() {
  const asPct = (score?: number) => {
    const n = Number(score || 0);
    return n <= 1 ? n * 100 : n;
  };
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);
  
  // Assignment modal state
  const [assignmentModal, setAssignmentModal] = useState<{ open: boolean; shipmentId: string | null }>({ open: false, shipmentId: null });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');

  useEffect(() => {
    Promise.all([
      api.getAllShipments().then((data) => setShipments(Array.isArray(data) ? data : [])).catch(() => setShipments([])),
      api.getAllDrivers().then((data) => setDrivers(Array.isArray(data) ? data : [])).catch(() => setDrivers([]))
    ]).finally(() => setLoading(false));
  }, []);

  const viewMatches = async (id: string) => {
    setSelectedId(id);
    setMatchLoading(true);
    try {
      const data = await api.getShipmentMatches(id);
      setMatches(Array.isArray(data) ? data : []);
    } catch {
      setMatches([]);
    } finally {
      setMatchLoading(false);
    }
  };

  const openAssignmentModal = async (shipmentId: string) => {
    setAssignmentModal({ open: true, shipmentId });
    setSelectedDriver(null);
    setSelectedVehicle(null);
    setVehicles([]);
    setAssignmentError('');
  };

  const loadDriverVehicles = async (driverId: string) => {
    try {
      const data = await api.getDriverVehicles(driverId);
      setVehicles(Array.isArray(data) ? data : []);
      setSelectedVehicle(null);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
      setVehicles([]);
    }
  };

  const handleAssignShipment = async () => {
    if (!selectedDriver || !selectedVehicle || !assignmentModal.shipmentId) {
      setAssignmentError('Please select both driver and vehicle');
      return;
    }

    setAssignmentLoading(true);
    setAssignmentError('');
    try {
      await api.acceptMatch(assignmentModal.shipmentId, selectedVehicle, selectedDriver);
      // Refresh shipments list
      const data = await api.getAllShipments();
      setShipments(Array.isArray(data) ? data : []);
      setAssignmentModal({ open: false, shipmentId: null });
    } catch (err: any) {
      setAssignmentError(err.response?.data?.message || 'Failed to assign shipment');
    } finally {
      setAssignmentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="h-7 w-7 text-violet-400" />
            Shipments
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {shipments.length} total shipments
          </p>
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-gray-400">
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3 font-medium">Destination</th>
                <th className="px-6 py-3 font-medium">Load Type</th>
                <th className="px-6 py-3 font-medium">Weight</th>
                <th className="px-6 py-3 font-medium">Temp</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Est. Cost</th>
                <th className="px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">{s.source_location}</td>
                  <td className="px-6 py-4">{s.destination_location}</td>
                  <td className="px-6 py-4">{s.load_type}</td>
                  <td className="px-6 py-4">{s.load_weight} kg</td>
                  <td className="px-6 py-4">
                    {s.required_temp !== 0 ? `${s.required_temp}°C` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-6 py-4">
                    {s.estimated_cost > 0 ? `₹${s.estimated_cost.toFixed(0)}` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => viewMatches(s.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-violet-500/10 text-violet-300 hover:bg-blue-100 transition"
                      >
                        <Search className="h-3.5 w-3.5" /> Matches
                      </button>
                      <button
                        onClick={() => openAssignmentModal(s.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition"
                      >
                        <CheckCircle className="h-3.5 w-3.5" /> Assign
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No shipments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match results modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Match Results
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {matchLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-4">
                  {matches.map((m, idx) => (
                    <div
                      key={idx}
                      className="border border-white/10 rounded-xl p-4 space-y-4"
                    >
                      {/* Header with score */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <span className="text-sm font-medium text-white">
                          Assigned Vehicle
                        </span>
                        <div className="text-right">
                          <div className="text-lg font-bold text-violet-400">
                            {asPct(m.match_score).toFixed(1)}% match
                          </div>
                          <div className="text-xs text-gray-400">
                            Rule: {asPct(m.rule_score ?? m.match_score).toFixed(1)}%
                            {m.ml_score != null ? ` · ML: ${asPct(m.ml_score).toFixed(1)}%` : ''}
                          </div>
                          <div className="text-xs mt-1">
                            <span className={`px-2 py-0.5 rounded-full ${m.score_source === 'hybrid' ? 'bg-emerald-100 text-emerald-400' : 'bg-white/10 text-gray-400'}`}>
                              {m.score_source || 'rules'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score breakdown */}
                      {m.score_details && (
                        <div className="bg-white/5 rounded-lg p-3 space-y-2">
                          <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Score Components</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Route Overlap (30%):</span>
                              <span className="font-medium text-white">{(m.score_details.route_overlap * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Temp Match (25%):</span>
                              <span className="font-medium text-white">{(m.score_details.temp_match * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Capacity Fit (20%):</span>
                              <span className="font-medium text-white">{(m.score_details.capacity_fit * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Time Match (15%):</span>
                              <span className="font-medium text-white">{(m.score_details.time_match * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between col-span-2">
                              <span className="text-gray-400">Distance Fit (10%):</span>
                              <span className="font-medium text-white">{(m.score_details.distance_deviation * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ML Confidence & Explanation */}
                      {m.score_source === 'hybrid' && m.confidence != null && (
                        <div className="bg-violet-500/10 rounded-lg p-3 space-y-2">
                          <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Model Insights</h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">ML Confidence:</span>
                              <span className="font-medium text-violet-300">{(m.confidence * 100).toFixed(0)}%</span>
                            </div>
                            {m.explanation && (
                              <div className="space-y-1">
                                <span className="text-gray-400">Reasoning:</span>
                                <p className="text-gray-300 italic">{m.explanation}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Pricing breakdown */}
                      {m.pricing_breakdown && (
                        <div className="bg-emerald-500/10 rounded-lg p-3 space-y-2">
                          <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">Pricing Breakdown</h4>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Base Rate:</span>
                              <span className="text-white">₹{m.pricing_breakdown.base_rate.toFixed(1)}/km</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Distance ({m.pricing_breakdown.distance.toFixed(0)} km):</span>
                              <span className="text-white">₹{m.pricing_breakdown.distance_cost.toFixed(0)}</span>
                            </div>
                            {m.pricing_breakdown.refrigeration_cost > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Refrigeration:</span>
                                <span className="text-white">₹{m.pricing_breakdown.refrigeration_cost.toFixed(0)}</span>
                              </div>
                            )}
                            {m.pricing_breakdown.deviation_cost > 0 && (
                              <div className="flex justify-between">
                                <span className="text-gray-400">Deviation Cost:</span>
                                <span className="text-white">₹{m.pricing_breakdown.deviation_cost.toFixed(0)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-semibold border-t border-emerald-200 pt-1 text-emerald-400">
                              <span>Total Cost:</span>
                              <span>₹{m.pricing_breakdown.total.toFixed(0)}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Summary metrics */}
                      <div className="grid grid-cols-3 gap-3 text-sm text-gray-400 pt-2">
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">Est. Cost</div>
                          <div className="font-semibold text-violet-400">₹{m.estimated_cost.toFixed(0)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">Est. Time</div>
                          <div className="font-semibold text-violet-400">{(m.estimated_time / 60).toFixed(1)} hrs</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-400 text-xs">CO₂</div>
                          <div className="font-semibold text-violet-400">{m.carbon_footprint.toFixed(1)} kg</div>
                        </div>
                      </div>

                      {m.reasons && m.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {m.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs rounded-full bg-white/10 text-gray-400"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">
                  No matches found for this shipment
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assignment modal */}
      {assignmentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl max-w-xl w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Assign Shipment to Driver</h2>
              <button
                onClick={() => setAssignmentModal({ open: false, shipmentId: null })}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {assignmentError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-400">
                  {assignmentError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Driver
                </label>
                <select
                  value={selectedDriver || ''}
                  onChange={(e) => {
                    setSelectedDriver(e.target.value);
                    if (e.target.value) {
                      loadDriverVehicles(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a driver...</option>
                  {drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>
                      {d.first_name} {d.last_name} - {d.email}
                    </option>
                  ))}
                </select>
              </div>

              {selectedDriver && vehicles.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Select Vehicle
                  </label>
                  <select
                    value={selectedVehicle || ''}
                    onChange={(e) => setSelectedVehicle(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicle_type} - {v.license_plate}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDriver && vehicles.length === 0 && (
                <div className="p-3 bg-amber-500/10 border border-amber-200 rounded-lg text-sm text-amber-400">
                  This driver has no vehicles
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setAssignmentModal({ open: false, shipmentId: null })}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-gray-300 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignShipment}
                  disabled={!selectedDriver || !selectedVehicle || assignmentLoading}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {assignmentLoading ? 'Assigning...' : 'Assign Shipment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-400',
    booked: 'bg-blue-100 text-violet-300',
    in_transit: 'bg-violet-100 text-violet-700',
    delivered: 'bg-emerald-100 text-emerald-400',
    cancelled: 'bg-red-100 text-red-400',
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        colors[status] || 'bg-white/10 text-gray-400'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
