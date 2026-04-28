import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Shipment, MatchResult, Driver, Vehicle } from "../types";
import {
  Package,
  Search,
  X,
  Zap,
  CheckCircle,
  BarChart3,
  TrendingUp,
  Gauge,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

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
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    shipmentId: string | null;
  }>({ open: false, shipmentId: null });
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");

  useEffect(() => {
    Promise.all([
      api
        .getAllShipments()
        .then((data) => setShipments(Array.isArray(data) ? data : []))
        .catch(() => setShipments([])),
      api
        .getAllDrivers()
        .then((data) => setDrivers(Array.isArray(data) ? data : []))
        .catch(() => setDrivers([])),
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
    setAssignmentError("");
  };

  const loadDriverVehicles = async (driverId: string) => {
    try {
      const data = await api.getDriverVehicles(driverId);
      setVehicles(Array.isArray(data) ? data : []);
      setSelectedVehicle(null);
    } catch (err) {
      console.error("Failed to load vehicles:", err);
      setVehicles([]);
    }
  };

  const handleAssignShipment = async () => {
    if (!selectedDriver || !selectedVehicle || !assignmentModal.shipmentId) {
      setAssignmentError("Please select both driver and vehicle");
      return;
    }

    setAssignmentLoading(true);
    setAssignmentError("");
    try {
      await api.acceptMatch(
        assignmentModal.shipmentId,
        selectedVehicle,
        selectedDriver,
      );
      // Refresh shipments list
      const data = await api.getAllShipments();
      setShipments(Array.isArray(data) ? data : []);
      setAssignmentModal({ open: false, shipmentId: null });
    } catch (err: any) {
      setAssignmentError(
        err.response?.data?.message || "Failed to assign shipment",
      );
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
                    {s.required_temp !== 0 ? `${s.required_temp}°C` : "—"}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-6 py-4">
                    {s.estimated_cost > 0
                      ? `₹${s.estimated_cost.toFixed(0)}`
                      : "—"}
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
                  <td
                    colSpan={8}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    No shipments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match results modal with graphs */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white/5 backdrop-blur-md rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/10 sticky top-0 bg-white/5 backdrop-blur-md">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-violet-400" />
                Match Analysis & Trip Details
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
                <div className="space-y-8">
                  {/* Price Comparison Chart */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-emerald-400" />
                      Price Comparison Across Matches
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={matches.map((m, idx) => ({
                          name: `Match ${idx + 1}`,
                          cost: m.estimated_cost,
                          score: asPct(m.match_score),
                        }))}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.1)"
                        />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                        <YAxis yAxisId="left" stroke="rgba(255,255,255,0.5)" />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          stroke="rgba(255,255,255,0.5)"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(15,23,42,0.8)",
                            border: "none",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="cost"
                          fill="#10b981"
                          name="Est. Cost (₹)"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="score"
                          fill="#8b5cf6"
                          name="Match Score (%)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Score Comparison Radar Chart */}
                  {matches.length > 0 && matches[0].score_details && (
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Gauge className="h-5 w-5 text-blue-400" />
                        Score Breakdown - Best Match
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <RadarChart
                          data={[
                            {
                              component: "Route",
                              value:
                                (matches[0].score_details?.route_overlap ?? 0) *
                                100,
                              fullMark: 100,
                            },
                            {
                              component: "Temperature",
                              value:
                                (matches[0].score_details?.temp_match ?? 0) *
                                100,
                              fullMark: 100,
                            },
                            {
                              component: "Capacity",
                              value:
                                (matches[0].score_details?.capacity_fit ?? 0) *
                                100,
                              fullMark: 100,
                            },
                            {
                              component: "Time",
                              value:
                                (matches[0].score_details?.time_match ?? 0) *
                                100,
                              fullMark: 100,
                            },
                            {
                              component: "Distance",
                              value:
                                (matches[0].score_details?.distance_deviation ??
                                  0) * 100,
                              fullMark: 100,
                            },
                          ]}
                        >
                          <PolarGrid stroke="rgba(255,255,255,0.2)" />
                          <PolarAngleAxis
                            dataKey="component"
                            stroke="rgba(255,255,255,0.5)"
                          />
                          <PolarRadiusAxis stroke="rgba(255,255,255,0.5)" />
                          <Radar
                            name="Match Score"
                            dataKey="value"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.6}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "rgba(15,23,42,0.8)",
                              border: "none",
                              borderRadius: "8px",
                            }}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {/* Cost Breakdown Stacked Chart */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Pricing Breakdown Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        {matches[0]?.pricing_breakdown && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">Base Rate:</span>
                              <span className="text-white font-semibold">
                                ₹
                                {matches[0].pricing_breakdown.base_rate.toFixed(
                                  1,
                                )}
                                /km
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">
                                Distance Cost:
                              </span>
                              <span className="text-white font-semibold">
                                ₹
                                {matches[0].pricing_breakdown.distance_cost.toFixed(
                                  0,
                                )}
                              </span>
                            </div>
                            {matches[0].pricing_breakdown.refrigeration_cost >
                              0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">
                                  Refrigeration:
                                </span>
                                <span className="text-white font-semibold">
                                  ₹
                                  {matches[0].pricing_breakdown.refrigeration_cost.toFixed(
                                    0,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.deviation_cost >
                              0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">
                                  Deviation Cost:
                                </span>
                                <span className="text-white font-semibold">
                                  ₹
                                  {matches[0].pricing_breakdown.deviation_cost.toFixed(
                                    0,
                                  )}
                                </span>
                              </div>
                            )}
                            <div className="border-t border-white/20 pt-3 mt-3 flex justify-between items-center">
                              <span className="text-gray-300 font-semibold">
                                Total Cost:
                              </span>
                              <span className="text-emerald-400 font-bold text-lg">
                                ₹{matches[0].pricing_breakdown.total.toFixed(0)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="space-y-3">
                        {matches[0] && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">
                                Estimated Time:
                              </span>
                              <span className="text-white font-semibold">
                                {(matches[0].estimated_time / 60).toFixed(1)}{" "}
                                hours
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">
                                Carbon Footprint:
                              </span>
                              <span className="text-white font-semibold">
                                {matches[0].carbon_footprint.toFixed(1)} kg CO₂
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400">
                                Match Score:
                              </span>
                              <span className="text-violet-400 font-semibold">
                                {asPct(matches[0].match_score).toFixed(1)}%
                              </span>
                            </div>
                            {matches[0].confidence !== undefined && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">
                                  Confidence Level:
                                </span>
                                <span className="text-blue-400 font-semibold">
                                  {(matches[0].confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Efficiency Metrics Comparison */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      All Matches Summary
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-gray-400 border-b border-white/10">
                          <tr>
                            <th className="text-left py-2 px-3">Rank</th>
                            <th className="text-left py-2 px-3">Score</th>
                            <th className="text-left py-2 px-3">Cost</th>
                            <th className="text-left py-2 px-3">Time</th>
                            <th className="text-left py-2 px-3">CO₂</th>
                            <th className="text-left py-2 px-3">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {matches.map((m, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="py-3 px-3 font-semibold text-white">
                                #{idx + 1}
                              </td>
                              <td className="py-3 px-3">
                                <span className="text-violet-400 font-semibold">
                                  {asPct(m.match_score).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 px-3 text-emerald-400">
                                ₹{m.estimated_cost.toFixed(0)}
                              </td>
                              <td className="py-3 px-3 text-blue-400">
                                {(m.estimated_time / 60).toFixed(1)}h
                              </td>
                              <td className="py-3 px-3 text-yellow-400">
                                {m.carbon_footprint.toFixed(1)}kg
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`px-2 py-1 rounded text-xs ${m.score_source === "hybrid" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"}`}
                                >
                                  {m.score_source || "rules"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Individual Match Details */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">
                      Detailed Match Information
                    </h3>
                    {matches.map((m, idx) => (
                      <div
                        key={idx}
                        className="border border-white/10 rounded-xl p-4 bg-white/5"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-lg font-semibold text-white">
                            Match #{idx + 1}
                          </span>
                          <span className="text-2xl font-bold text-violet-400">
                            {asPct(m.match_score).toFixed(1)}%
                          </span>
                        </div>
                        {m.explanation && (
                          <p className="text-gray-300 text-sm italic mb-3">
                            💡 {m.explanation}
                          </p>
                        )}
                        {m.reasons && m.reasons.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {m.reasons.map((r, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 text-xs rounded-full bg-white/10 text-gray-300"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-400 py-12">
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
              <h2 className="text-lg font-semibold text-white">
                Assign Shipment to Driver
              </h2>
              <button
                onClick={() =>
                  setAssignmentModal({ open: false, shipmentId: null })
                }
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
                  value={selectedDriver || ""}
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
                    value={selectedVehicle || ""}
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
                  onClick={() =>
                    setAssignmentModal({ open: false, shipmentId: null })
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 text-gray-300 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignShipment}
                  disabled={
                    !selectedDriver || !selectedVehicle || assignmentLoading
                  }
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {assignmentLoading ? "Assigning..." : "Assign Shipment"}
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
    pending: "bg-amber-100 text-amber-400",
    booked: "bg-blue-100 text-violet-300",
    in_transit: "bg-violet-100 text-violet-700",
    delivered: "bg-emerald-100 text-emerald-400",
    cancelled: "bg-red-100 text-red-400",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        colors[status] || "bg-white/10 text-gray-400"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
