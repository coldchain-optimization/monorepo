import { useEffect, useState } from 'react';
import { api } from '../api/client';
import MapView from '../components/MapView.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import { MapPin, Clock, Truck, Thermometer, Navigation } from 'lucide-react';

const KNOWN_CITY_COORDS = {
  mumbai: { lat: 19.0760, lng: 72.8777 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  kochi: { lat: 9.9312, lng: 76.2673 },
  cochin: { lat: 9.9312, lng: 76.2673 },
  hyderabad: { lat: 17.3850, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  pune: { lat: 18.5204, lng: 73.8567 },
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  indore: { lat: 22.7196, lng: 75.8577 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  lucknow: { lat: 26.8467, lng: 80.9462 },
  patna: { lat: 25.5941, lng: 85.1376 },
  surat: { lat: 21.1702, lng: 72.8311 },
  kanyakumari: { lat: 8.0883, lng: 77.5385 },
  trivandrum: { lat: 8.5241, lng: 76.9366 },
  thiruvananthapuram: { lat: 8.5241, lng: 76.9366 },
};

function getCoordsFromLocation(location, fallbackSeed = 'default') {
  const normalized = String(location || '').toLowerCase().trim();
  for (const [city, coords] of Object.entries(KNOWN_CITY_COORDS)) {
    if (normalized.includes(city)) {
      return coords;
    }
  }

  // Deterministic fallback for unknown locations (India-ish bounding box)
  const seed = `${normalized}-${fallbackSeed}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const lat = 8 + (Math.abs(hash) % 2700) / 100; // 8.00 - 35.00
  const lng = 68 + (Math.abs(hash * 7) % 2900) / 100; // 68.00 - 97.00
  return { lat, lng };
}

function buildWaypoints(origin, destination, count = 4) {
  const points = [];
  for (let i = 1; i <= count; i += 1) {
    const t = i / (count + 1);
    points.push({
      lat: origin.lat + (destination.lat - origin.lat) * t,
      lng: origin.lng + (destination.lng - origin.lng) * t,
    });
  }
  return points;
}

export default function TrackingPage() {
  const [shipments, setShipments] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [trackingEvents, setTrackingEvents] = useState([]);
  const [statusEvents, setStatusEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0);

  // Load shipments
  useEffect(() => {
    const loadShipments = async () => {
      try {
        const data = await api.getShipments();
        const allShipments = Array.isArray(data) ? data : (data?.shipments || []);
        setShipments(allShipments);
        if (allShipments.length > 0) {
          setSelectedShipmentId(allShipments[0].id);
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

    const selectedShipment = shipments.find((s) => s.id === selectedShipmentId);
    const isTrackable = selectedShipment && selectedShipment.assigned_vehicle;

    if (!isTrackable) {
      setTracking(null);
      setTrackingEvents([]);
      setStatusEvents([]);
      return;
    }

    setAnimationProgress(0);

    const loadTracking = async () => {
      try {
        const status = await api.getTrackingStatus(selectedShipmentId);
        const history = await api.getTrackingHistory(selectedShipmentId);
        setTracking(status);
        setTrackingEvents(history?.events || []);

        // Load status events if endpoint exists
        try {
          const statusRes = await api.get(`/status/${selectedShipmentId}/history`);
          setStatusEvents(statusRes?.events || []);
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
  }, [selectedShipmentId, shipments]);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId);
  const mapOrigin = getCoordsFromLocation(selectedShipment?.source_location, `${selectedShipment?.id}-src`);
  const mapDestination = getCoordsFromLocation(selectedShipment?.destination_location, `${selectedShipment?.id}-dst`);
  const mapWaypoints = buildWaypoints(mapOrigin, mapDestination, 4);

  return (
    <div className="min-h-screen bg-[#0F1117] text-gray-100">
      {/* Header */}
      <div className="bg-white/5 border-b border-white/10 p-6 backdrop-blur-md">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Navigation className="h-8 w-8" />
          Live Tracking Dashboard
        </h1>
        <p className="text-gray-400 mt-2">Monitor your shipment in real-time with interactive map</p>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Shipment Selector */}
        {shipments.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Shipment to Track
            </label>
            <select
              value={selectedShipmentId || ''}
              onChange={(e) => setSelectedShipmentId(e.target.value)}
              className="w-full bg-[#0F1117]/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
            >
              {shipments.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.source_location} → {s.destination_location} | {s.status || 'pending'}
                </option>
              ))}
            </select>
          </div>
        )}

        {selectedShipmentId && !tracking && selectedShipment && !selectedShipment?.assigned_vehicle && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-4">
            This shipment is created but not assigned to a vehicle yet. Tracking will appear after admin assigns a driver and vehicle.
          </div>
        )}

        {tracking ? (
          <>
            {/* Main tracking card */}
            <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
              <div className="bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 border-b border-white/10 p-6 backdrop-blur-md">
                <h2 className="text-2xl font-bold mb-2">{tracking.vehicle_info}</h2>
                <p className="text-gray-300">Driver: {tracking.driver_name}</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Status and Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 uppercase font-semibold tracking-wider">
                      Current Status
                    </label>
                    <p className="text-2xl font-bold text-white capitalize mt-1">
                      {tracking.status.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 uppercase font-semibold tracking-wider flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Current Location
                    </label>
                    <p className="text-2xl font-bold text-white mt-1">
                      {tracking.current_location}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-300">
                      {tracking.distance_traveled_km.toFixed(1)} km traveled
                    </span>
                    <span className="font-medium text-gray-300">
                      {tracking.distance_remaining_km.toFixed(1)} km remaining
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full transition-all duration-300 ease-out"
                      style={{ width: `${animationProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Start</span>
                    <span>{animationProgress.toFixed(0)}%</span>
                    <span>Destination</span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 border-l-4 border-l-blue-500 backdrop-blur-md hover:bg-white/10 transition-all">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Truck className="h-4 w-4" />
                      Speed
                    </label>
                    <p className="text-2xl font-bold text-white mt-1">
                      {tracking.speed.toFixed(0)} km/h
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 border-l-4 border-l-red-500 backdrop-blur-md hover:bg-white/10 transition-all">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Thermometer className="h-4 w-4" />
                      Temperature
                    </label>
                    <p className="text-2xl font-bold text-white mt-1">
                      {tracking.temperature}°C
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 border-l-4 border-l-amber-500 backdrop-blur-md hover:bg-white/10 transition-all">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      ETA
                    </label>
                    <p className="text-2xl font-bold text-white mt-1">
                      {new Date(tracking.estimated_arrival).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 border-l-4 border-l-emerald-500 backdrop-blur-md hover:bg-white/10 transition-all">
                    <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      Last Update
                    </label>
                    <p className="text-sm font-bold text-white mt-1">
                      {new Date(tracking.last_update).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Route Info */}
                <div className="bg-white/5 rounded-xl p-6 space-y-3 border border-white/10 border-l-4 border-l-violet-500 backdrop-blur-md">
                  <div>
                    <p className="text-sm text-gray-400 font-medium">From</p>
                    <p className="text-lg font-bold text-white">
                      {selectedShipment?.source_location}
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Navigation className="h-6 w-6 text-gray-500 rotate-45" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 font-medium">To</p>
                    <p className="text-lg font-bold text-white">
                      {selectedShipment?.destination_location}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Map */}
            <MapView
              key={selectedShipmentId}
              latitude={tracking.latitude}
              longitude={tracking.longitude}
              origin={mapOrigin}
              destination={mapDestination}
              waypoints={mapWaypoints}
              animationProgress={animationProgress}
            />

            {/* Status Timeline */}
            {statusEvents.length > 0 && (
              <StatusTimeline events={statusEvents} currentStatus={tracking.status} />
            )}

            {/* Waypoints Timeline - Legacy view */}
            {trackingEvents.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                <h3 className="text-xl font-bold text-white mb-6 tracking-wide">GPS Waypoints History</h3>
                <div className="space-y-4">
                  {trackingEvents.map((event, idx) => (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-violet-600 border border-violet-400/30 text-white flex items-center justify-center font-bold text-xs">
                          {idx + 1}
                        </div>
                        {idx < trackingEvents.length - 1 && (
                          <div className="w-1 h-12 bg-white/10 my-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-white capitalize">
                              {event.status.replace('_', ' ')}
                            </h4>
                            <span className="text-xs text-gray-400">
                              {new Date(event.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-sm text-gray-300 space-y-1">
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
          <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center backdrop-blur-md">
            <p className="text-gray-400 text-lg">
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
