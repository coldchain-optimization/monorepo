import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Shipment, MatchResult } from '../types';
import { Package, Search, X, Zap } from 'lucide-react';

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [matchLoading, setMatchLoading] = useState(false);

  useEffect(() => {
    api
      .getAllShipments()
      .then((data) => setShipments(Array.isArray(data) ? data : []))
      .catch(() => setShipments([]))
      .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="h-7 w-7 text-blue-600" />
            Shipments
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {shipments.length} total shipments
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-6 py-3 font-medium">ID</th>
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
            <tbody className="divide-y divide-slate-100">
              {shipments.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {s.id.slice(0, 8)}…
                  </td>
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
                    <button
                      onClick={() => viewMatches(s.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                    >
                      <Search className="h-3.5 w-3.5" /> Matches
                    </button>
                  </td>
                </tr>
              ))}
              {shipments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
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
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Match Results
              </h2>
              <button
                onClick={() => setSelectedId(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              {matchLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-4">
                  {matches.map((m, idx) => (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-800">
                          Vehicle: {m.vehicle_id.slice(0, 8)}…
                        </span>
                        <span className="text-lg font-bold text-blue-600">
                          {m.match_score.toFixed(1)}% match
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm text-slate-600">
                        <div>
                          <span className="text-slate-400">Cost:</span>{' '}
                          ₹{m.estimated_cost.toFixed(0)}
                        </div>
                        <div>
                          <span className="text-slate-400">Time:</span>{' '}
                          {m.estimated_time.toFixed(1)}h
                        </div>
                        <div>
                          <span className="text-slate-400">CO₂:</span>{' '}
                          {m.carbon_footprint.toFixed(1)} kg
                        </div>
                      </div>
                      {m.reasons && m.reasons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {m.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600"
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
                <p className="text-center text-slate-400 py-8">
                  No matches found for this shipment
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    booked: 'bg-blue-100 text-blue-700',
    in_transit: 'bg-violet-100 text-violet-700',
    delivered: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
        colors[status] || 'bg-slate-100 text-slate-600'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}
