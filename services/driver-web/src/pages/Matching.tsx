import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { MatchResult } from '../types';

export function Matching() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    minScore: 0,
    maxDistance: 100,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchMatches();
  }, [user, navigate]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const data = await apiClient.searchMatches({
        limit: 20,
      });
      setMatches(data.matches || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (match: MatchResult) => {
    try {
      if (!match.shipment) throw new Error('Shipment data not available');
      await apiClient.acceptMatch(
        match.shipment.id,
        match.vehicle_id || '',
        match.match_score,
        match.estimated_cost || 0
      );
      alert('Match accepted! You can now proceed with the shipment.');
      await fetchMatches();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to accept match');
    }
  };

  const handleReject = async (matchId: string) => {
    try {
      await apiClient.rejectMatch();
      setMatches(matches.filter((m) => m.id !== matchId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to reject match');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-600">Loading shipment matches...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Shipment Matches</h1>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Match Score
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={filters.minScore}
              onChange={(e) =>
                setFilters({ ...filters, minScore: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <p className="text-sm text-gray-600 mt-1">{filters.minScore}%</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Distance (km)
            </label>
            <input
              type="range"
              min="0"
              max="500"
              step="10"
              value={filters.maxDistance}
              onChange={(e) =>
                setFilters({ ...filters, maxDistance: parseInt(e.target.value) })
              }
              className="w-full"
            />
            <p className="text-sm text-gray-600 mt-1">{filters.maxDistance} km</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              &nbsp;
            </label>
            <button
              onClick={fetchMatches}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Matches List */}
      {matches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">No matches found. Try adjusting filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {matches
            .filter((match) => match.match_score * 100 >= filters.minScore)
            .map((match) => (
              <div key={match.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {match.shipment?.source_location} → {match.shipment?.destination_location}
                      </h3>
                      <span
                        className={`text-lg font-bold px-3 py-1 rounded ${
                          match.match_score * 100 >= 80
                            ? 'bg-green-100 text-green-800'
                            : match.match_score * 100 >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {(match.match_score * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-gray-600">
                      Shipment ID: {match.shipment?.id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-indigo-600">
                      ₹{match.shipment?.estimated_cost || 0}
                    </p>
                    <p className="text-sm text-gray-600">Estimated Cost</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-6 py-4 border-t border-b border-gray-200">
                  <div>
                    <p className="text-gray-600 text-sm">Pickup Date</p>
                    <p className="font-semibold">
                      {new Date(match.shipment?.time_window_start || '').toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Delivery Date</p>
                    <p className="font-semibold">
                      {new Date(match.shipment?.time_window_end || '').toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Weight</p>
                    <p className="font-semibold">{match.shipment?.load_weight}kg</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Temperature</p>
                    <p className="font-semibold">{match.shipment?.required_temp}°C</p>
                  </div>
                </div>

                <p className="text-gray-700 mb-6">
                  <strong>Load Type:</strong> {match.shipment?.load_type} | <strong>Volume:</strong> {match.shipment?.load_volume}m³
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleAccept(match)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
                  >
                    Accept Match
                  </button>
                  <button
                    onClick={() => handleReject(match.id)}
                    className="flex-1 bg-gray-300 text-gray-800 py-2 rounded-lg hover:bg-gray-400 font-semibold"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
