import * as Location from 'expo-location';

let locationSubscription = null;

/**
 * Request location permission from user
 * Returns true if granted, false otherwise
 */
export async function requestLocationPermission() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      console.log('[LocationService] Foreground location permission granted');
      return true;
    } else {
      console.warn('[LocationService] Foreground location permission denied');
      return false;
    }
  } catch (error) {
    console.error('[LocationService] Permission request error:', error);
    return false;
  }
}

/**
 * Get current device location (one-time read)
 * Returns { latitude, longitude, speed, heading } or null if permission denied
 */
export async function getCurrentLocation() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[LocationService] Location permission not granted');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 5000,
    });

    const coords = location.coords;
    return {
      latitude: coords.latitude,
      longitude: coords.longitude,
      speed: coords.speed || 0, // in m/s, convert if needed
      heading: coords.heading || 0,
      accuracy: coords.accuracy,
      altitude: coords.altitude,
    };
  } catch (error) {
    console.error('[LocationService] Error getting current location:', error);
    return null;
  }
}

/**
 * Watch location changes and call callback on each update
 * Returns unsubscribe function
 */
export function watchLocation(onLocationUpdate, options = {}) {
  const {
    accuracy = Location.Accuracy.High,
    timeInterval = 5000, // 5 seconds
    distanceInterval = 10, // 10 meters
  } = options;

  (async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('[LocationService] Cannot watch location - permission not granted');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy,
          timeInterval,
          distanceInterval,
        },
        (location) => {
          const coords = location.coords;
          const locationData = {
            latitude: coords.latitude,
            longitude: coords.longitude,
            speed: coords.speed ? coords.speed * 3.6 : 0, // Convert m/s to km/h
            heading: coords.heading || 0,
            accuracy: coords.accuracy,
            altitude: coords.altitude,
            timestamp: location.timestamp,
          };
          onLocationUpdate(locationData);
        }
      );

      console.log('[LocationService] Started watching location');
    } catch (error) {
      console.error('[LocationService] Error watching location:', error);
    }
  })();

  // Return unsubscribe function
  return () => {
    if (locationSubscription) {
      locationSubscription.remove();
      locationSubscription = null;
      console.log('[LocationService] Stopped watching location');
    }
  };
}

/**
 * Stop watching location
 */
export function stopWatchingLocation() {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
    console.log('[LocationService] Location watching stopped');
  }
}
