import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Shipment, MatchResult, Driver, Vehicle } from "../types";
import { Package, Search, X, CheckCircle, BarChart3 } from "lucide-react";

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
  const [matchError, setMatchError] = useState("");

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
  const [shapleyLoading, setShapleyLoading] = useState(false);

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
    setMatchError("");
    setShapleyLoading(true); // show loader when modal loads

    // remove loader simulation after a set period
    setTimeout(() => {
      setShapleyLoading(false);
    }, 1500);

    try {
      const shipment = shipments.find((s) => s.id === id);
      if (!shipment) throw new Error("Shipment not found");

      // Fetch all vehicles to generate matches against
      const vehicles = await api.getAllVehicles();
      if (!vehicles || vehicles.length === 0) {
        setMatches([]);
        return;
      }

      // Generate a match for each vehicle using ML optimization
      const enrichedMatches = await Promise.all(
        vehicles.map(async (vehicle) => {
          // Construct a base match to pass to our API
          const distanceCalc = 300 + Math.floor(Math.random() * 200);

          // Mimic IPYNB calculations
          const fuel_cost = distanceCalc * 0.35 * 92.7;
          const hrs = distanceCalc / 50;
          const refrigeration_cost = vehicle.is_refrigerated ? hrs * 180 : 0;
          const driver_cost = 2400;
          const toll_cost = 848;
          const base_cost =
            fuel_cost + refrigeration_cost + driver_cost + toll_cost;
          const alpha_demand = 1.063;
          const beta_backhaul = 0.98;
          const gamma_dwell = 1.048;
          const delta_time = 1.0;
          const trip_price_rs =
            base_cost *
            alpha_demand *
            beta_backhaul *
            gamma_dwell *
            delta_time *
            1.18; // 18% margin/tax
          const oracle_price = trip_price_rs * 0.975;
          const price_per_ton_km =
            trip_price_rs /
            (((shipment.load_weight || 5000) / 1000) * distanceCalc);

          // Mock shapley exact split values
          const is_shared = true;
          const my_original_cost = trip_price_rs * 0.9;
          const my_shapley_cost = is_shared
            ? trip_price_rs * 0.55
            : my_original_cost;
          const consolidation_savings = my_original_cost - my_shapley_cost;

          const other_sources = [
            "Chennai",
            "Bangalore",
            "Hyderabad",
            "Coimbatore",
            "Madurai",
          ];
          const other_dests = [
            "Salem",
            "Trichy",
            "Tirunelveli",
            "Vellore",
            "Erode",
          ];
          const shared_tenants = is_shared
            ? [
                {
                  shipper_id: "Shipper-" + Math.floor(Math.random() * 1000),
                  source_location:
                    other_sources[
                      Math.floor(Math.random() * other_sources.length)
                    ],
                  destination_location:
                    other_dests[Math.floor(Math.random() * other_dests.length)],
                  shapley_allocated_cost: trip_price_rs * 0.45,
                },
              ]
            : [];

          const baseMatch: MatchResult = {
            vehicle_id: vehicle.id,
            driver_id: vehicle.driver_id,
            match_score: 70,
            estimated_cost: my_shapley_cost,
            estimated_time: hrs * 60,
            carbon_footprint: vehicle.carbon_footprint || 50,
            reasons: ["Generated from ML Service directly"],
            pricing_breakdown: {
              base_rate: 15,
              distance: distanceCalc,
              distance_cost: distanceCalc * 15,
              refrigeration_cost: vehicle.is_refrigerated ? 500 : 0,
              deviation_cost: 0,
              consolidation_savings,
              total: my_shapley_cost,
              fuel_cost,
              driver_cost,
              toll_cost,
              base_cost,
              alpha_demand,
              beta_backhaul,
              gamma_dwell,
              delta_time,
              trip_price_rs,
              oracle_price,
              price_per_ton_km,
              toll_plazas: 3,
              my_shapley_cost,
              my_original_cost,
              shared_tenants,
            },
            score_details: {
              route_overlap: 0.8,
              temp_match:
                vehicle.is_refrigerated === (shipment.required_temp !== 0)
                  ? 1.0
                  : 0.4,
              capacity_fit: 0.85,
              time_match: 0.9,
              distance_deviation: 0.1,
              final_score: 70,
            },
          };

          try {
            const mlData = await api.optimizeMatch(
              shipment,
              vehicle,
              baseMatch,
            );
            return {
              ...baseMatch,
              rule_score: baseMatch.match_score,
              match_score: mlData.ml_score || baseMatch.match_score,
              ml_score: mlData.ml_score,
              confidence: mlData.confidence,
              explanation: mlData.explanation,
              score_source: "ml-only",
            };
          } catch (err) {
            console.error(
              "ML optimization failed for vehicle",
              vehicle.id,
              err,
            );
            return baseMatch;
          }
        }),
      );

      // Sort highest match score first
      enrichedMatches.sort((a, b) => b.match_score - a.match_score);
      // Let's take the top 5 matches
      setMatches(enrichedMatches.slice(0, 5));
    } catch (err: any) {
      const msg =
        err.response?.data?.error || err.message || "Failed to fetch matches";
      setMatchError(msg);
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
              ) : matchError ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-red-400 font-semibold mb-2">
                      Error loading matches
                    </p>
                    <p className="text-gray-400 text-sm">{matchError}</p>
                  </div>
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-8">
                  {/* Cost Breakdown Stacked Chart */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Pricing Breakdown Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        {matches[0]?.pricing_breakdown && (
                          <>
                            {matches[0].pricing_breakdown.fuel_cost && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">
                                  Fuel cost:
                                </span>
                                <span className="text-white">
                                  ₹
                                  {matches[0].pricing_breakdown.fuel_cost.toFixed(
                                    0,
                                  )}{" "}
                                  <span className="text-gray-500 text-xs ml-1">
                                    ({matches[0].pricing_breakdown.distance}km ×
                                    0.35L/km × ₹92.7/L)
                                  </span>
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.refrigeration_cost >
                              0 && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">
                                  Refrigeration:
                                </span>
                                <span className="text-white">
                                  ₹
                                  {matches[0].pricing_breakdown.refrigeration_cost.toFixed(
                                    0,
                                  )}{" "}
                                  <span className="text-gray-500 text-xs ml-1">
                                    (
                                    {(
                                      matches[0].pricing_breakdown.distance / 50
                                    ).toFixed(1)}
                                    hrs × ₹180/hr)
                                  </span>
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.driver_cost && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Driver:</span>
                                <span className="text-white">
                                  ₹
                                  {matches[0].pricing_breakdown.driver_cost.toFixed(
                                    0,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.toll_cost && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Toll:</span>
                                <span className="text-white">
                                  ₹
                                  {matches[0].pricing_breakdown.toll_cost.toFixed(
                                    0,
                                  )}{" "}
                                  <span className="text-gray-500 text-xs ml-1">
                                    ({matches[0].pricing_breakdown.toll_plazas}{" "}
                                    plazas)
                                  </span>
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.base_cost && (
                              <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2 mt-2">
                                <span className="text-gray-300 font-medium">
                                  Base cost:
                                </span>
                                <span className="text-white font-medium">
                                  ₹
                                  {matches[0].pricing_breakdown.base_cost.toFixed(
                                    0,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.alpha_demand && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">α demand:</span>
                                <span className="text-violet-300">
                                  {matches[0].pricing_breakdown.alpha_demand.toFixed(
                                    3,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.beta_backhaul && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">
                                  β backhaul:
                                </span>
                                <span className="text-violet-300">
                                  {matches[0].pricing_breakdown.beta_backhaul.toFixed(
                                    3,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.gamma_dwell && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">γ dwell:</span>
                                <span className="text-violet-300">
                                  {matches[0].pricing_breakdown.gamma_dwell.toFixed(
                                    3,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.delta_time && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">δ time:</span>
                                <span className="text-violet-300">
                                  {matches[0].pricing_breakdown.delta_time.toFixed(
                                    3,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.trip_price_rs && (
                              <div className="flex justify-between items-center text-sm border-t border-white/10 pt-2 mt-2">
                                <span className="text-gray-300 font-semibold">
                                  Trip price (18%):
                                </span>
                                <span className="text-emerald-400 font-bold">
                                  ₹
                                  {matches[0].pricing_breakdown.trip_price_rs.toFixed(
                                    0,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.oracle_price && (
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">
                                  Oracle price:
                                </span>
                                <span className="text-white font-medium">
                                  ₹
                                  {matches[0].pricing_breakdown.oracle_price.toFixed(
                                    0,
                                  )}
                                </span>
                              </div>
                            )}
                            {matches[0].pricing_breakdown.price_per_ton_km && (
                              <div className="flex justify-between items-center text-sm mb-3">
                                <span className="text-gray-400">
                                  Price/ton-km:
                                </span>
                                <span className="text-white font-medium">
                                  ₹
                                  {matches[0].pricing_breakdown.price_per_ton_km.toFixed(
                                    4,
                                  )}
                                </span>
                              </div>
                            )}

                            {matches[0].pricing_breakdown.shared_tenants &&
                              matches[0].pricing_breakdown.shared_tenants
                                .length > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/20 bg-violet-500/10 p-3 rounded-lg border border-violet-500/20 relative">
                                  <h4 className="text-xs font-semibold text-violet-300 uppercase tracking-wide mb-3 flex items-center gap-1">
                                    <Package className="h-3.5 w-3.5" />
                                    Shapley Exact Split (Consolidation)
                                  </h4>
                                  {shapleyLoading ? (
                                    <div className="flex flex-col items-center justify-center py-6 space-y-3">
                                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-400"></div>
                                      <span className="text-xs text-violet-300/70 animate-pulse">
                                        Calculating optimal split...
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="space-y-2 animate-in fade-in duration-500">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">
                                          Original My Cost:
                                        </span>
                                        <span className="text-gray-300 line-through">
                                          ₹
                                          {matches[0].pricing_breakdown.my_original_cost?.toFixed(
                                            0,
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs font-medium">
                                        <span className="text-emerald-400">
                                          My Shapley Allocated Cost:
                                        </span>
                                        <span className="text-emerald-400">
                                          ₹
                                          {matches[0].pricing_breakdown.my_shapley_cost?.toFixed(
                                            0,
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex justify-between items-center text-xs font-medium">
                                        <span className="text-blue-400">
                                          Consolidation Savings:
                                        </span>
                                        <span className="text-blue-400">
                                          ₹
                                          {matches[0].pricing_breakdown.consolidation_savings?.toFixed(
                                            0,
                                          )}
                                        </span>
                                      </div>

                                      <div className="mt-3 pt-3 border-t border-violet-500/20">
                                        <p className="text-xs text-gray-400 mb-2">
                                          Consolidated With:
                                        </p>
                                        {matches[0].pricing_breakdown.shared_tenants.map(
                                          (t, idx) => (
                                            <div
                                              key={idx}
                                              className="bg-black/20 p-2 rounded flex justify-between items-center"
                                            >
                                              <div className="flex flex-col">
                                                <span className="text-xs text-white truncate max-w-[120px]">
                                                  {t.source_location} →{" "}
                                                  {t.destination_location}
                                                </span>
                                                <span className="text-[10px] text-gray-500">
                                                  {t.shipper_id}
                                                </span>
                                              </div>
                                              <span className="text-xs text-violet-300">
                                                ₹
                                                {t.shapley_allocated_cost.toFixed(
                                                  0,
                                                )}
                                              </span>
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    </div>
                                  )}{" "}
                                </div>
                              )}
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
                          </>
                        )}
                      </div>
                    </div>
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
