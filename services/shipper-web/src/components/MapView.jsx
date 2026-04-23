import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function MapView({
  latitude,
  longitude,
  origin,
  destination,
  waypoints,
  animationProgress,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const vehicleMarker = useRef(null);
  const routeLine = useRef(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Create map centered on origin with higher default zoom for better detail
    map.current = L.map(mapContainer.current, {
      zoomControl: true,
      preferCanvas: true, // Better performance for mobile
    }).setView([origin.lat, origin.lng], 10);

    // Add high-quality tile layer (CartoDB Positron - better for urban areas and Indian cities)
    // Free tier, no API key needed, excellent accuracy for city-level mapping
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© CartoDB contributors | © OpenStreetMap contributors',
      maxZoom: 20,
      minZoom: 2,
      crossOrigin: true,
    }).addTo(map.current);

    // Alternative tile layers users can switch to (optional layer control)
    const osmStandard = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    });
    
    const osmTopoMap = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenTopoMap contributors',
      maxZoom: 17,
    });

    // Add origin marker (pickup)
    L.marker([origin.lat, origin.lng], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .addTo(map.current)
      .bindPopup('Pickup Location', { permanent: true })
      .openPopup();

    // Add destination marker (delivery)
    L.marker([destination.lat, destination.lng], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .addTo(map.current)
      .bindPopup('Delivery Location', { permanent: true })
      .openPopup();

    // Add route line
    const routeCoordinates = [
      [origin.lat, origin.lng],
      ...waypoints.map((wp) => [wp.lat, wp.lng]),
      [destination.lat, destination.lng],
    ];

    routeLine.current = L.polyline(routeCoordinates, {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.7,
      dashArray: '5, 5',
    }).addTo(map.current);

    // Add vehicle marker
    vehicleMarker.current = L.marker([latitude, longitude], {
      icon: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      }),
    })
      .addTo(map.current)
      .bindPopup('Vehicle Location')
      .openPopup();

    // Fit bounds to show entire route
    const bounds = L.latLngBounds([
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
      ...waypoints.map((wp) => [wp.lat, wp.lng]),
    ]);
    map.current.fitBounds(bounds, { padding: [50, 50] });

    return () => {
      // React StrictMode mounts/unmounts effects twice in development.
      // Explicit cleanup prevents "Map container is already initialized".
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      vehicleMarker.current = null;
      routeLine.current = null;
    };
  }, []);

  // Update vehicle marker position based on animation progress
  useEffect(() => {
    if (!vehicleMarker.current || !map.current) return;

    // Calculate interpolated position based on progress
    const allPoints = [
      [origin.lat, origin.lng],
      ...waypoints.map((wp) => [wp.lat, wp.lng]),
      [destination.lat, destination.lng],
    ];

    if (allPoints.length < 2) return;

    // Calculate which segment we're on based on progress
    const progress = animationProgress / 100;
    const totalSegments = allPoints.length - 1;
    const currentSegment = progress * totalSegments;
    const segmentIndex = Math.floor(currentSegment);
    const segmentProgress = currentSegment - segmentIndex;

    if (segmentIndex >= allPoints.length - 1) {
      // At destination
      vehicleMarker.current.setLatLng([destination.lat, destination.lng]);
    } else {
      // Interpolate between two points
      const start = allPoints[segmentIndex];
      const end = allPoints[segmentIndex + 1];
      const interpolatedLat = start[0] + (end[0] - start[0]) * segmentProgress;
      const interpolatedLng = start[1] + (end[1] - start[1]) * segmentProgress;
      vehicleMarker.current.setLatLng([interpolatedLat, interpolatedLng]);
    }
  }, [animationProgress, origin, destination, waypoints]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden backdrop-blur-md">
      <div
        ref={mapContainer}
        style={{
          height: '400px',
          width: '100%',
          position: 'relative',
        }}
        className="z-10"
      />
      <div className="p-4 bg-white/5 border-t border-white/10">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400 font-medium">
            📍 Current Position: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
          <span className="px-3 py-1 bg-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.2)] text-violet-300 rounded-full text-xs font-semibold border border-violet-500/30">
            Progress: {animationProgress.toFixed(0)}%
          </span>
        </div>
      </div>
    </div>
  );
}
