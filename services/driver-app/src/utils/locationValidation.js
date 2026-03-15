/**
 * Distance validation utility for pickup/delivery
 * Ensures driver is within acceptable range of source/destination
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Check if driver is within acceptable range of location
 * @param {object} driverLocation - { latitude, longitude }
 * @param {object} targetLocation - { latitude, longitude }
 * @param {number} radiusKm - Acceptable radius in kilometers (default 50km)
 */
export function isWithinLocation(driverLocation, targetLocation, radiusKm = 50) {
  if (!driverLocation || !targetLocation) {
    return false;
  }

  const distance = calculateDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );

  return distance <= radiusKm;
}

/**
 * Get distance and direction from driver to target location
 */
export function getLocationInfo(driverLocation, targetLocation) {
  if (!driverLocation || !targetLocation) {
    return { distance: null, direction: null };
  }

  const distance = calculateDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    targetLocation.latitude,
    targetLocation.longitude
  );

  // Calculate bearing (direction)
  const lat1 = driverLocation.latitude;
  const lon1 = driverLocation.longitude;
  const lat2 = targetLocation.latitude;
  const lon2 = targetLocation.longitude;

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  const direction = ((bearing + 360) % 360).toFixed(0);

  return {
    distance: distance.toFixed(2),
    direction: `${direction}°`,
  };
}

/**
 * Get human-readable distance description
 */
export function getDistanceDescription(distanceKm) {
  if (distanceKm < 0.1) {
    return 'You are at the location';
  }
  if (distanceKm < 0.5) {
    return `${(distanceKm * 1000).toFixed(0)}m away`;
  }
  if (distanceKm < 2) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  return `${distanceKm.toFixed(1)} km away - too far`;
}
