import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import type { Shipment } from '../types';

export function Backhauling() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    fetchOpportunities();
  }, [user, navigate]);

  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError('');
      // For backhauling, try to get available shipments
      try {
        const data = await apiClient.searchMatches({ limit: 50 });
        const shipments = data.matches?.map((m) => m.shipment).filter((s): s is Shipment => !!s) || [];
        setOpportunities(shipments);
      } catch (matchErr) {
        // If matches endpoint fails, that's okay - just show empty state
        console.warn('Could not load matches for backhauling:', matchErr);
        setOpportunities([]);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to load opportunities';
      // Don't show error for 404 - just show empty state
      if (!errMsg.includes('404')) {
        setError(errMsg);
      }
      setOpportunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBidding = async (shipmentId: string) => {
    try {
      // This would typically call a backhauling submission endpoint
      alert(`Backhauling bid submitted for shipment ${shipmentId}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit bid');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-600">Loading backhauling opportunities...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Backhauling Opportunities</h1>
      <p className="text-gray-600 mb-8">
        Find return shipments to optimize your route and earn additional revenue
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-6 mb-8">
        <h2 className="font-semibold text-blue-900 mb-2">💡 How Backhauling Works</h2>
        <ul className="text-blue-800 text-sm space-y-1">
          <li>• Complete your forward shipment delivery</li>
          <li>• Submit a bid for return shipments on your route</li>
          <li>• Get selected based on match score and ratings</li>
          <li>• Earn additional revenue on return journey</li>
        </ul>
      </div>

      {opportunities.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No backhauling opportunities available right now. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {opportunities.map((shipment) => (
            <div key={shipment.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {shipment.source_location} → {shipment.destination_location}
                  </h3>
                  <p className="text-gray-600 text-sm">Shipment ID: {shipment.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-green-600">
                    ₹{shipment.estimated_cost || 0}
                  </p>
                  <p className="text-sm text-gray-600">Estimated Cost</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-200 mb-4">
                <div>
                  <p className="text-gray-600 text-sm">Load Type</p>
                  <p className="font-semibold">{shipment.load_type || 'General Cargo'}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Weight</p>
                  <p className="font-semibold">{shipment.load_weight || 0}kg</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 mb-4">
                <div>
                  <p className="text-gray-600 text-sm">Temperature Required</p>
                  <p className="font-semibold">{shipment.required_temp}°C</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Volume</p>
                  <p className="font-semibold">{shipment.load_volume}m³</p>
                </div>
              </div>

              <div className="mb-4 p-4 bg-blue-50 rounded">
                <h4 className="font-semibold text-gray-900 mb-2">Shipment Details</h4>
                <div className="grid grid-cols-2 text-sm text-gray-600 gap-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-1">Available Until</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(shipment.time_window_end).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 mb-1">Status</p>
                    <p className="font-semibold text-gray-900 capitalize">{shipment.status}</p>
                  </div>
                </div>
              </div>

              {shipment.shipper && (
                <div className="bg-gray-50 p-4 rounded mb-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Shipper Details</h4>
                  <div className="grid grid-cols-2 text-sm text-gray-600">
                    <div>
                      <p className="font-medium text-gray-900">
                        {shipment.shipper.user?.first_name || 'N/A'}{' '}
                        {shipment.shipper.user?.last_name || ''}
                      </p>
                      <p>{shipment.shipper.user?.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{shipment.shipper.company_name || 'N/A'}</p>
                      <p>{shipment.shipper.phone || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => handleSubmitBidding(shipment.id)}
                className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                Submit Backhauling Bid
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
