import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Driver, MatchResult } from '../types';
import { AlertCircle, TrendingUp, Zap, Award } from 'lucide-react';

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
        setError('');
        const driverData = await apiClient.getMyDriverProfile();
        setDriver(driverData);
        
        // Try to fetch matches, but don't fail if it errors
        try {
          const matchesData = await apiClient.searchMatches({ limit: 5 });
          setRecentMatches(matchesData.matches || matchesData || []);
        } catch (matchErr) {
          console.warn('Could not load matches:', matchErr);
          setRecentMatches([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        console.error('Dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <Zap className="h-8 w-8 text-indigo-600 animate-pulse" />
          </div>
          <p className="text-xl text-gray-700 font-semibold">Loading your dashboard...</p>
          <p className="text-gray-500 text-sm mt-2">Fetching your profile data</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 p-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-600">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Error Loading Dashboard</h3>
                <p className="text-gray-600 text-sm mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.first_name || 'Driver'}!
          </h1>
          <p className="text-gray-600">Here's your current activity and opportunities</p>
        </div>

        {/* Profile Status Card */}
        {driver && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-green-500">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="h-6 w-6 text-green-600" />
                  {driver.license_number ? 'Profile Verified ✓' : 'Complete Your Profile'}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-xs uppercase tracking-wide font-semibold">License</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{driver.license_number || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-xs uppercase tracking-wide font-semibold">Phone</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{driver.phone || '-'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-xs uppercase tracking-wide font-semibold">Experience</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{driver.years_of_experience || 0}y</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-600 text-xs uppercase tracking-wide font-semibold">Rating</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {driver.rating ? `${driver.rating.toFixed(1)} ⭐` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium whitespace-nowrap"
              >
                Edit Profile
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Active Vehicles</h3>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-blue-600 mb-2">
              {driver?.num_vehicles || 0}
            </p>
            <button
              onClick={() => navigate('/vehicles')}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              Manage Vehicles →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Available Matches</h3>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-green-600 mb-2">
              {recentMatches.length}
            </p>
            <button
              onClick={() => navigate('/matching')}
              className="text-green-600 hover:underline text-sm font-medium"
            >
              View All Matches →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-600 text-sm uppercase tracking-wide font-semibold">Total Earnings</h3>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Award className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-purple-600 mb-2">
              ₹{driver?.total_earnings || 0}
            </p>
            <p className="text-gray-500 text-sm">Ready to accept shipments</p>
          </div>
        </div>

        {/* Recent Matches */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Available Shipments</h3>
          {recentMatches.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-4">No shipment matches available right now</p>
              <p className="text-gray-500 text-sm mb-6">Check back later or register a vehicle to get started</p>
              <button
                onClick={() => navigate('/vehicles')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
              >
                Register Vehicle
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentMatches.map((match) => (
                <div
                  key={match.id}
                  className="border border-gray-200 rounded-lg p-5 hover:shadow-lg hover:border-indigo-300 transition"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full">
                          {(match.match_score * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 text-lg">
                        {match.shipment?.source || 'Unknown'} → {match.shipment?.destination || 'Unknown'}
                      </p>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      ₹{match.shipment?.estimated_cost || 0}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">
                    {match.reasons?.[0] || 'Good match for your profile'}
                  </p>
                  <button
                    onClick={() => navigate('/matching')}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition"
                  >
                    View Details & Accept
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/matching')}
            className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-indigo-800 font-semibold transition shadow-lg"
          >
            🎯 Search Shipments
          </button>
          <button
            onClick={() => navigate('/backhauling')}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold transition shadow-lg"
          >
            📍 Backhauling Opportunities
          </button>
        </div>
      </div>
    </div>
  );
}
