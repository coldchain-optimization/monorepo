import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { KnowledgeBase, Shipment, Vehicle } from "../types";
import { Brain } from "lucide-react";

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeBase[]>([]);
  const [shipments, setShipments] = useState<Record<string, Shipment>>({});
  const [vehicles, setVehicles] = useState<Record<string, Vehicle>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getKnowledgeBase(),
      api.getAllShipments().catch(() => []),
      api.getAllVehicles().catch(() => []),
    ])
      .then(([kbData, shipmentData, vehicleData]) => {
        setEntries(Array.isArray(kbData) ? kbData : []);

        const shMap: Record<string, Shipment> = {};
        if (Array.isArray(shipmentData)) {
          shipmentData.forEach((s) => (shMap[s.id] = s));
        }
        setShipments(shMap);

        const vMap: Record<string, Vehicle> = {};
        if (Array.isArray(vehicleData)) {
          vehicleData.forEach((v) => (vMap[v.id] = v));
        }
        setVehicles(vMap);
      })
      .catch(() => setEntries([]))
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
          <Brain className="h-7 w-7 text-violet-400" />
          Knowledge Base
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {entries.length} ML feedback entries
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-gray-400">
                <th className="px-6 py-3 font-medium">Route (Origin - Dest)</th>
                <th className="px-6 py-3 font-medium">Assigned Vehicle</th>
                <th className="px-6 py-3 font-medium">Match Score</th>
                <th className="px-6 py-3 font-medium">Est. Cost</th>
                <th className="px-6 py-3 font-medium">Actual Cost</th>
                <th className="px-6 py-3 font-medium">Pricing Factor</th>
                <th className="px-6 py-3 font-medium">Time Factor</th>
                <th className="px-6 py-3 font-medium">Carbon Factor</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-white/5">
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">
                      {shipments[e.shipment_id] ? (
                        <>
                          <span className="text-emerald-400 font-semibold">
                            {
                              shipments[e.shipment_id].source_location.split(
                                ",",
                              )[0]
                            }
                          </span>
                          <span className="mx-2 text-gray-400">→</span>
                          <span className="text-rose-400 font-semibold">
                            {
                              shipments[
                                e.shipment_id
                              ].destination_location.split(",")[0]
                            }
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 italic">
                          Unknown Route
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {vehicles[e.vehicle_id] ? (
                      <span className="text-gray-300 bg-white/10 px-2 py-1 rounded-md text-xs font-semibold">
                        {vehicles[e.vehicle_id].manufacturer}{" "}
                        {vehicles[e.vehicle_id].model}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">
                        Unknown Truck
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-violet-400">
                      {e.match_score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">₹{e.estimated_cost.toFixed(0)}</td>
                  <td className="px-6 py-4">₹{e.actual_cost.toFixed(0)}</td>
                  <td className="px-6 py-4">{e.pricing_factor.toFixed(2)}</td>
                  <td className="px-6 py-4">{e.time_factor.toFixed(2)}</td>
                  <td className="px-6 py-4">{e.carbon_factor.toFixed(2)}</td>
                  <td className="px-6 py-4 text-gray-400">
                    {new Date(e.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    No knowledge base entries yet. Submit match feedback to
                    populate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
