import { useEffect, useState } from 'react';
import { api } from '../api/client';
import MapView from '../components/MapView';
import StatusTimeline from '../components/StatusTimeline';
import { MapPin, Clock, Truck, Thermometer, Navigation } from 'lucide-react';

interface StatusEvent {
  id: string;
  shipment_id: string;
  driver_id: string;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  proof_image?: string;
  created_at: string;
}

interface TrackingEvent {
  id: string;
  shipment_id: string;
  vehicle_id: string;
  latitude: number;
  longitude: number;
  speed: number;
  heading: number;
  temperature: number;
  status: string;
  distance_traveled_km: number;
  distance_remaining_km: number;
  estimated_arrival_time: string;
  created_at: string;
}

interface TrackingSummary {
  shipment_id: string;
  current_location: string;
  latitude: number;
  longitude: number;
  status: string;
  driver_name: string;
  vehicle_info: string;
  distance_traveled_km: number;
  distance_remaining_km: number;
  estimated_arrival: string;
  speed: number;
  temperature: number;
  last_update: string;
}

interface Shipment {
  id: string;
  source_location: string;
  destination_location: string;
  status: string;
  assigned_vehicle: string;
  estimated_cost: number;
}

// Mumbai to Delhi coordinates for demo (approximate)
const ORIGIN_COORDS = { lat: 19.0760, lng: 72.8777 };
const DESTINATION_COORDS = { lat: 28.7041, lng: 77.1025 };
const WAYPOINTS = [
  { lat: 22.3039, lng: 73.1305 }, // Indore
  { lat: 23.1815, lng: 79.9864 }, // Jabalpur
  { lat: 25.4358, lng: 81.8463 }, // Allahabad
  { lat: 27.1767, lng: 78.0081 }, // Agra
];

export default function TrackingPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [tracking, setTracking] = useState<TrackingSummary | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [statusEvents, setStatusEvents] = useState<StatusEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Load shipments
  useEffect(() => {
    const loadShipments = async () => {
      try {
        const data = await api.getAvailableShipments();
        const booked = Array.isArray(data) ? data : (data as any).shipments || [];
        const bookedWithAssignment = booked.filter((s: any) => s.status === 'booked' && s.assigned_vehicle);
        setShipments(bookedWithAssignment);
        if (bookedWithAssignment.length > 0) {
          setSelectedShipmentId(bookedWithAssignment[0].id);
        }
      } catch (error) {
        console.error('Failed to load shipments:', error);
      } finally {
        setLoading(false);
      }
    };
    loadShipments();
  }, []);

  // Load tracking data when shipment is selected
  useEffect(() => {
    if (!selectedShipmentId) return;

    const loadTracking = async () => {
      try {
        const status = await api.getTrackingStatus(selectedShipmentId);
        const history = await api.getTrackingHistory(selectedShipmentId);
        setTracking(status);
        setTrackingEvents((history as any).events || []);
        setAnimationProgress(0);

        // Load status events if endpoint exists
        try {
          const statusRes = await api.get(`/status/${selectedShipmentId}/history`);
          setStatusEvents((statusRes as any).events || []);
        } catch {
          console.log('Status endpoint not yet available');
        }
      } catch (error) {
        console.error('Failed to load tracking:', error);
      }
    };

    loadTracking();
    
    // Poll for updates every 5 seconds
    const interval = setInterval(loadTracking, 5000);
    return () => clearInterval(interval);
  }, [selectedShipmentId]);

  // Animate vehicle progress
  useEffect(() => {
    if (!tracking) return;

    const totalDistance = tracking.distance_traveled_km + tracking.distance_remaining_km;
    const progress = (tracking.distance_traveled_km / totalDistance) * 100;
    
    const timer = setInterval(() => {
      setAnimationProgress((prev) => {
        const target = progress;
        if (prev < target) {
          return Math.min(prev + 0.5, target);
        }
        return prev;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [tracking]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-indigo-900 text-white p-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Navigation className="h-8 w-8" />
          Live Tracking Dashboard
        </h1>
        <p className="text-indigo-200 mt-2">Monitor your shipment in real-time with interactive map</p>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Shipment Selector */}
        {shipments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Shipment to Track
            </label>
            <select
              value={selectedShipmentId || ''}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.source_location} → {s.destination_location} (₹{s.estimated_cost.toFixed(0)})
                </option>
              ))}
            </select>
          </div>
        )}

        {tracking ? (
          <>
            {/* Main tracking card */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-6 text-white">
                <h2 className="text-2xl font-bold mb-2">{tracking.vehicle_info}</h2>
                <p className="text-indigo-100">Driver: {tracking.driver_name}</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Status and Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 uppercase font-semibold">
                      Current Status
                    </label>
                    <p className="text-2xl font-bold text-gray-900 capitalize mt-1">
                      {tracking.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 uppercase font-semibold flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Current Location
                    </label>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {tracking.current_location}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {tracking.distance_traveled_km.toFixed(1)} km traveled
                    </span>
                    <span className="font-medium text-gray-700">
                      {tracking.distance_remaining_km.toFixed(1)} km remaining
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-400 to-blue-500 h-full transition-all duration-300 ease-out"
                      style={{ width: `${animationProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Start</span>
                    <span>{animationProgress.toFixed(0)}%</span>
                    <span>Destination</span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <label className="text-xs text-gray-600 uppercase font-semibold flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      Speed
                    </label>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {tracking.speed.toFixed(0)} km/h
                    </p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4 border-l-4 border-red-500">
                    <label className="text-xs text-gray-600 uppercase font-semibold flex items-center gap-1">
                      <Thermometer className="h-4 w-4" />
                      Temperature
                    </label>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {tracking.temperature}°C
                    </p>
                  </div>

                  <div className="bg-amber-50 rounded-lg p-4 border-l-4 border-amber-500">
                    <label className="text-xs text-gray-600 uppercase font-semibold flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      ETA
                    </label>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {new Date(tracking.estimated_arrival).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="bg-emerald-50 rounded-lg p-4 border-l-4 border-emerald-500">
                    <label className="text-xs text-gray-600 uppercase font-semibold">
                      Last Update
                    </label>
                    <p className="text-sm font-bold text-emerald-600 mt-1">
                      {new Date(tracking.last_update).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Route Info */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 border-l-4 border-purple-500">
                  <div>
                    <p className="text-sm text-gray-600">From</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {shipments.find((s) => s.id === selectedShipmentId)?.source_location}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Navigation className="h-6 w-6 text-gray-400 rotate-45" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">To</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {shipments.find((s) => s.id === selectedShipmentId)?.destination_location}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <MapView
              latitude={tracking.latitude}
              longitude={tracking.longitude}
              origin={ORIGIN_COORDS}
              destination={DESTINATION_COORDS}
              waypoints={WAYPOINTS}
              animationProgress={animationProgress}
            />

            {/* Status Timeline */}
            {statusEvents.length > 0 && (
              <StatusTimeline events={statusEvents} currentStatus={tracking.status} />
            )}

            {/* Waypoints Timeline - Legacy view */}
            {trackingEvents.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6">GPS Waypoints History</h3>
                <div className="space-y-4">
                  {trackingEvents.map((event, idx) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        {idx < trackingEvents.length - 1 && (
                          <div className="w-1 h-12 bg-indigo-200 my-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900 capitalize">
                              {event.status.replace('_', ' ')}
                            </h4>
                            <span className="text-xs text-gray-500">
                              {new Date(event.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              📍 {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                            </p>
                            <p>
                              📏 {event.distance_traveled_km.toFixed(1)} km traveled, {event.distance_remaining_km.toFixed(1)} km remaining
                            </p>
                            <p>🚗 Speed: {event.speed.toFixed(1)} km/h</p>
                            <p>🌡️ Temperature: {event.temperature}°C</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 text-lg">
              {selectedShipmentId
                ? 'Loading tracking information...'
                : 'No shipments to track yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
