import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { KnowledgeBase } from '../types';
import { Brain } from 'lucide-react';

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getKnowledgeBase()
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Brain className="h-7 w-7 text-blue-600" />
          Knowledge Base
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {entries.length} ML feedback entries
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-500">
                <th className="px-6 py-3 font-medium">ID</th>
                <th className="px-6 py-3 font-medium">Shipment</th>
                <th className="px-6 py-3 font-medium">Vehicle</th>
                <th className="px-6 py-3 font-medium">Match Score</th>
                <th className="px-6 py-3 font-medium">Est. Cost</th>
                <th className="px-6 py-3 font-medium">Actual Cost</th>
                <th className="px-6 py-3 font-medium">Pricing Factor</th>
                <th className="px-6 py-3 font-medium">Time Factor</th>
                <th className="px-6 py-3 font-medium">Carbon Factor</th>
                <th className="px-6 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {e.id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {e.shipment_id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">
                    {e.vehicle_id.slice(0, 8)}…
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-blue-600">
                      {e.match_score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">₹{e.estimated_cost.toFixed(0)}</td>
                  <td className="px-6 py-4">₹{e.actual_cost.toFixed(0)}</td>
                  <td className="px-6 py-4">{e.pricing_factor.toFixed(2)}</td>
                  <td className="px-6 py-4">{e.time_factor.toFixed(2)}</td>
                  <td className="px-6 py-4">{e.carbon_factor.toFixed(2)}</td>
                  <td className="px-6 py-4 text-slate-500">
                    {new Date(e.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    No knowledge base entries yet. Submit match feedback to populate.
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
