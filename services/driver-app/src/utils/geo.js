export const KNOWN_CITY_COORDS = {
  mumbai: { latitude: 19.0760, longitude: 72.8777 },
  delhi: { latitude: 28.7041, longitude: 77.1025 },
  bengaluru: { latitude: 12.9716, longitude: 77.5946 },
  bangalore: { latitude: 12.9716, longitude: 77.5946 },
  kochi: { latitude: 9.9312, longitude: 76.2673 },
  cochin: { latitude: 9.9312, longitude: 76.2673 },
  hyderabad: { latitude: 17.3850, longitude: 78.4867 },
  chennai: { latitude: 13.0827, longitude: 80.2707 },
  kolkata: { latitude: 22.5726, longitude: 88.3639 },
  pune: { latitude: 18.5204, longitude: 73.8567 },
  ahmedabad: { latitude: 23.0225, longitude: 72.5714 },
  jaipur: { latitude: 26.9124, longitude: 75.7873 },
  indore: { latitude: 22.7196, longitude: 75.8577 },
  bhopal: { latitude: 23.2599, longitude: 77.4126 },
  lucknow: { latitude: 26.8467, longitude: 80.9462 },
  patna: { latitude: 25.5941, longitude: 85.1376 },
  surat: { latitude: 21.1702, longitude: 72.8311 },
  kanyakumari: { latitude: 8.0883, longitude: 77.5385 },
  trivandrum: { latitude: 8.5241, longitude: 76.9366 },
  thiruvananthapuram: { latitude: 8.5241, longitude: 76.9366 },
};

export function getCoordsFromLocation(location, fallbackSeed = 'default') {
  const normalized = String(location || '').toLowerCase().trim();
  for (const [city, coords] of Object.entries(KNOWN_CITY_COORDS)) {
    if (normalized.includes(city)) {
      return coords;
    }
  }

  const seed = `${normalized}-${fallbackSeed}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const latitude = 8 + (Math.abs(hash) % 2700) / 100;
  const longitude = 68 + (Math.abs(hash * 7) % 2900) / 100;
  return { latitude, longitude };
}

export function buildWaypoints(origin, destination, count = 4) {
  const points = [];
  for (let i = 1; i <= count; i += 1) {
    const t = i / (count + 1);
    points.push({
      latitude: origin.latitude + (destination.latitude - origin.latitude) * t,
      longitude: origin.longitude + (destination.longitude - origin.longitude) * t,
    });
  }
  return points;
}

export function approxDistanceKm(origin, destination) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLon = toRad(destination.longitude - origin.longitude);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.latitude)) * Math.cos(toRad(destination.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
