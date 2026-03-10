import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Driver, MatchResult } from '../types';

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [recentMatches, setRecentMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [driverData, matchesData] = await Promise.all([
          apiClient.getMyDriverProfile(),
          apiClient.searchMatches({ limit: 5 }),
        ]);
        setDriver(driverData);
        setRecentMatches(matchesData.matches || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Driver Dashboard</h1>

      {/* Profile Card */}
      {driver && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {driver.license_number ? 'Profile Verified ✓' : 'Profile Incomplete'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-600 text-sm">License Number</p>
              <p className="text-lg font-semibold">{driver.license_number}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Phone</p>
              <p className="text-lg font-semibold">{driver.phone}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Experience</p>
              <p className="text-lg font-semibold">{driver.years_of_experience} years</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Rating</p>
              <p className="text-lg font-semibold">
                {driver.rating ? `${driver.rating.toFixed(1)} ⭐` : 'No ratings yet'}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Edit Profile
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Active Vehicles</p>
          <p className="text-4xl font-bold text-indigo-600">
            {driver?.num_vehicles || 0}
          </p>
          <button
            onClick={() => navigate('/vehicles')}
            className="mt-2 text-indigo-600 hover:underline text-sm"
          >
            Manage →
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Available Matches</p>
          <p className="text-4xl font-bold text-green-600">
            {recentMatches.length}
          </p>
          <button
            onClick={() => navigate('/matching')}
            className="mt-2 text-indigo-600 hover:underline text-sm"
          >
            View Matches →
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600 text-sm">Total Earnings</p>
          <p className="text-4xl font-bold text-green-600">
            ₹{driver?.total_earnings || 0}
          </p>
        </div>
      </div>

      {/* Recent Matches */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Recent Matches</h3>
        {recentMatches.length === 0 ? (
          <p className="text-gray-600">No matches available yet</p>
        ) : (
          <div className="space-y-4">
            {recentMatches.map((match) => (
              <div
                key={match.id}
                className="border border-gray-200 rounded p-4 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      Match Score: {(match.match_score * 100).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      From: {match.shipment?.source} → {match.shipment?.destination}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-indigo-600">
                    ₹{match.shipment?.estimated_cost || 0}
                  </span>
                </div>
                <button
                  onClick={() => navigate('/matching')}
                  className="text-indigo-600 hover:underline text-sm"
                >
                  View Details →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/matching')}
          className="bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 font-semibold"
        >
          Search Shipments
        </button>
        <button
          onClick={() => navigate('/backhauling')}
          className="bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold"
        >
          Backhauling Opportunities
        </button>
      </div>
    </div>
  );
}
