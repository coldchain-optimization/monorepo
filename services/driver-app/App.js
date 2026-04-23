import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { api } from './src/api/client';
import { TABS, TAB_ORDER } from './src/constants/tabs';
import { styles } from './src/styles/appStyles';
import { requestLocationPermission, getCurrentLocation, watchLocation, stopWatchingLocation } from './src/services/locationService';
import { isWithinLocation, getLocationInfo, calculateDistance } from './src/utils/locationValidation';
import AlertService from './src/services/alertService';
import { getCoordsFromLocation } from './src/utils/geo';
import BottomTabs from './src/components/BottomTabs';
import KpiStrip from './src/components/KpiStrip';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AssignmentsScreen from './src/screens/AssignmentsScreen';
import MatchingScreen from './src/screens/MatchingScreen';
import BackhaulingScreen from './src/screens/BackhaulingScreen';
import LiveTrackingScreen from './src/screens/LiveTrackingScreen';
import ShipmentDecisionModal from './src/components/ShipmentDecisionModal';

function AppContent() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState(process.env.EXPO_PUBLIC_DEMO_EMAIL || 'driver1@looplink.com');
  const [password, setPassword] = useState(process.env.EXPO_PUBLIC_DEMO_PASSWORD || 'driver123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(TABS.DASHBOARD);

  const [shipments, setShipments] = useState([]);
  const [matches, setMatches] = useState([]);
  const [backhaulOptions, setBackhaulOptions] = useState([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState([]);
  const [driverVehicles, setDriverVehicles] = useState([]);
  const [driverId, setDriverId] = useState(null);
  const [activeShipment, setActiveShipment] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState(null);
  const [trackingHistory, setTrackingHistory] = useState([]);
  const [statusHistory, setStatusHistory] = useState([]);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const pollingIntervalRef = useRef(null);

  const isLoggedIn = !!token;

  // Auto-poll for new assignments when on Assignments tab
  useEffect(() => {
    if (!isLoggedIn || tab !== TABS.ASSIGNMENTS) {
      // Clear polling interval if not logged in or not on Assignments tab
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Start polling for new assignments every 3 seconds
    const pollAssignments = async () => {
      try {
        const res = await api.getAvailableShipments();
        const myVehicleIds = new Set((driverVehicles || []).map((v) => v.id));
        const assigned = (res.shipments || []).filter(
          (s) => s.status === 'booked' && (!myVehicleIds.size || myVehicleIds.has(s.assigned_vehicle))
        );
        setPendingAssignments(assigned);
        console.log('[App] Auto-polling: Found', assigned.length, 'pending assignments');
      } catch (e) {
        console.error('[App] Auto-polling error:', e.message);
      }
    };

    // Initial poll immediately
    pollAssignments();

    // Then poll every 3 seconds
    pollingIntervalRef.current = setInterval(pollAssignments, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isLoggedIn, tab, driverVehicles]);

  useEffect(() => {
    if (!isLoggedIn || tab !== TABS.LIVE_TRACKING || !activeShipment?.id) {
      stopWatchingLocation();
      return;
    }

    let unsubscribe = null;

    const startLiveTracking = async () => {
      // First, get status history from backend
      try {
        const statusTimelineRes = await api.getStatusHistory(activeShipment.id).catch(() => ({ events: [] }));
        setStatusHistory(statusTimelineRes?.events || []);
      } catch (e) {
        console.warn('[App] Failed to load status history:', e.message);
      }

      // Watch real device GPS location
      unsubscribe = watchLocation(
        (locationData) => {
          console.log('[App] GPS update:', locationData);
          
          // Construct tracking status from real GPS
          const trackingData = {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
            status: 'in_transit',
            speed: Math.round(locationData.speed || 0),
            temperature: 18, // Default temp - could be from IoT sensor
            estimated_arrival: new Date(Date.now() + 60 * 60 * 1000), // Placeholder
            accuracy: locationData.accuracy,
          };
          
          setTrackingStatus(trackingData);

          // Push new location to the backend
          api.updateLocation(activeShipment.id, {
            latitude: locationData.latitude,
            longitude: locationData.longitude,
          }).catch(e => console.warn('[App] Error sending location to server', e));
          
          // Add to tracking history
          setTrackingHistory((prev) => [
            ...prev,
            {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              timestamp: locationData.timestamp,
            },
          ]);
        },
        {
          accuracy: 6, // High accuracy
          timeInterval: 5000, // 5 seconds
          distanceInterval: 10, // 10 meters
        }
      );
    };

    startLiveTracking();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isLoggedIn, tab, activeShipment?.id]);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    console.log('[App] Attempting login for:', email);
    try {
      const res = await api.login(email.trim(), password);
      console.log('[App] Login response:', res);
      api.setToken(res.token);
      setToken(res.token);
      setUser(res.user);
      
      // Request location permission after successful login
      const locationGranted = await requestLocationPermission();
      if (locationGranted) {
        console.log('[App] Location permission granted');
      } else {
        console.warn('[App] Location permission not granted - live tracking may not work');
      }
      
      await loadDashboardData();
      
      // Load driver's profile to get driver ID
      try {
        const driverRes = await api.getMyDriverProfile();
        console.log('[App] Driver profile:', driverRes);
        const driverId = driverRes.driver?.id || driverRes.id;
        
        if (driverId) {
          setDriverId(driverId);
          // Load driver's vehicles
          const vehiclesRes = await api.getDriverVehicles(driverId);
          const vehiclesList = vehiclesRes.vehicles || [];
          setDriverVehicles(vehiclesList);
          console.log('[App] Loaded', vehiclesList.length, 'vehicles for driver', driverId);
        } else {
          console.warn('[App] No driver ID found');
          setDriverId(null);
          setDriverVehicles([]);
        }
      } catch (e) {
        console.warn('[App] Failed to load driver profile or vehicles:', e.message);
        setDriverId(null);
        setDriverVehicles([]);
      }
    } catch (e) {
      console.error('[App] Login error:', e.message);
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    stopWatchingLocation();
    api.clearToken();
    setToken(null);
    setUser(null);
    setShipments([]);
    setMatches([]);
    setBackhaulOptions([]);
    setSelectedShipmentId(null);
    setDriverId(null);
    setDriverVehicles([]);
    setActiveShipment(null);
    setTrackingStatus(null);
    setTrackingHistory([]);
    setStatusHistory([]);
  };

  const loadDashboardData = async () => {
    try {
      const res = await api.getAvailableShipments();
      setShipments(res.shipments || []);
    } catch (e) {
      setError(e.message);
    }
  };

  const loadPendingAssignments = async () => {
    try {
      console.log('[App] Loading pending assignments...');
      const res = await api.getAvailableShipments();
      const myVehicleIds = new Set((driverVehicles || []).map((v) => v.id));
      const assigned = (res.shipments || []).filter(
        (s) => s.status === 'booked' && (!myVehicleIds.size || myVehicleIds.has(s.assigned_vehicle))
      );
      setPendingAssignments(assigned);
      console.log('[App] Pending assignments:', assigned.length);
    } catch (e) {
      setError(e.message);
    }
  };

  const acceptAssignment = async (assignment) => {
    // Open the decision modal instead of directly accepting
    setSelectedAssignment(assignment);
    setDecisionModalVisible(true);
  };

  const handleDecisionModalAccept = async () => {
    if (!selectedAssignment) return;
    
    setLoading(true);
    setError('');
    try {
      console.log('[App] Accepting assignment:', selectedAssignment.id);
      console.log('[App] Available vehicles:', driverVehicles);
      
      // Use the first available vehicle, or return error if none exist
      if (!driverVehicles || driverVehicles.length === 0) {
        const errMsg = 'No vehicles assigned to this driver. Please assign a vehicle first.';
        console.error('[App]', errMsg);
        setError(errMsg);
        return;
      }

      if (!driverId) {
        const errMsg = 'Driver profile not loaded yet. Please try again in a moment.';
        console.error('[App]', errMsg);
        setError(errMsg);
        return;
      }
      
      const vehicleId = driverVehicles[0].id;
      console.log('[App] Using vehicle:', vehicleId, driverVehicles[0]);
      
      await api.acceptMatch({
        shipment_id: selectedAssignment.id,
        vehicle_id: vehicleId,
        driver_id: driverId,
        match_score: 100,
        estimated_cost: selectedAssignment.estimated_cost,
      });
      
      console.log('[App] Assignment accepted successfully');
      setActiveShipment(selectedAssignment);
      setDecisionModalVisible(false);
      setSelectedAssignment(null);
      await loadPendingAssignments();
      setTab(TABS.LIVE_TRACKING);
    } catch (e) {
      console.error('[App] Accept assignment error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionModalReject = () => {
    setDecisionModalVisible(false);
    setSelectedAssignment(null);
    setError('');
  };

  const findMatches = async (shipmentId) => {
    setLoading(true);
    setSelectedShipmentId(shipmentId);
    setError('');
    try {
      const res = await api.searchMatches(shipmentId);
      setMatches(res.matches || []);
      setTab(TABS.MATCHING);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const acceptMatch = async (match) => {
    if (!selectedShipmentId) return;
    setLoading(true);
    setError('');
    try {
      await api.acceptMatch({
        shipment_id: selectedShipmentId,
        vehicle_id: match.vehicle_id,
        driver_id: match.driver_id,
        match_score: match.match_score,
        estimated_cost: match.estimated_cost,
      });
      setMatches([]);
      await loadDashboardData();
      setTab(TABS.DASHBOARD);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const findBackhauling = async (shipmentId) => {
    setLoading(true);
    setSelectedShipmentId(shipmentId);
    setError('');
    try {
      const res = await api.getBackhauling(shipmentId);
      setBackhaulOptions(res.backhauling_options || []);
      setTab(TABS.BACKHAULING);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsPickedUp = async () => {
    if (!activeShipment?.id || !driverId || !trackingStatus) return;

    try {
      // Get source location coordinates
      const sourceCoords = getCoordsFromLocation(activeShipment.source_location, `${activeShipment.id}-src`);
      const driverCoords = {
        latitude: trackingStatus.latitude,
        longitude: trackingStatus.longitude,
      };

      // Check if driver is within 50km of source location
      const withinRange = isWithinLocation(driverCoords, sourceCoords, 50);

      if (!withinRange) {
        const locationInfo = getLocationInfo(driverCoords, sourceCoords);
        AlertService.showPickupLocationMismatch(
          `${locationInfo.distance} km`,
          () => markAsPickedUp() // Retry
        );
        return;
      }

      // Show confirmation before marking
      AlertService.showPickupConfirmation(
        activeShipment.source_location,
        async () => {
          try {
            console.log('[App] Recording pickup event...');
            const result = await api.recordPickupEvent(activeShipment.id, {
              driver_id: driverId,
              location: activeShipment.source_location,
              latitude: trackingStatus.latitude,
              longitude: trackingStatus.longitude,
            });
            console.log('[App] Pickup recorded:', result);

            AlertService.showSuccess(
              'Pickup Confirmed',
              `Picked up from ${activeShipment.source_location}`,
              () => {
                // Reload shipment data
                loadDashboardData();
              }
            );
          } catch (e) {
            console.error('[App] Pickup error:', e.message);
            AlertService.showError('Pickup Failed', e.message, () => {});
          }
        },
        () => {} // Cancel
      );
    } catch (e) {
      console.error('[App] Pickup validation error:', e.message);
      AlertService.showError('Error', e.message, () => {});
    }
  };

  const markAsDelivered = async () => {
    if (!activeShipment?.id || !driverId || !trackingStatus) return;

    try {
      // Get destination location coordinates
      const destCoords = getCoordsFromLocation(activeShipment.destination_location, `${activeShipment.id}-dst`);
      const driverCoords = {
        latitude: trackingStatus.latitude,
        longitude: trackingStatus.longitude,
      };

      // Check if driver is within 50km of destination location
      const withinRange = isWithinLocation(driverCoords, destCoords, 50);

      if (!withinRange) {
        const locationInfo = getLocationInfo(driverCoords, destCoords);
        // Show emergency delivery option
        AlertService.showDeliveryLocationMismatch(
          `${locationInfo.distance} km`,
          () => markAsDelivered(), // Retry
          () => requestEmergencyDelivery() // Emergency delivery
        );
        return;
      }

      // Show confirmation before marking
      AlertService.showDeliveryConfirmation(
        activeShipment.destination_location,
        async () => {
          try {
            console.log('[App] Recording delivery event...');
            const result = await api.recordDeliveryEvent(activeShipment.id, {
              driver_id: driverId,
              location: activeShipment.destination_location,
              latitude: trackingStatus.latitude,
              longitude: trackingStatus.longitude,
              proof_image: '',
            });
            console.log('[App] Delivery recorded:', result);

            AlertService.showSuccess(
              'Delivery Confirmed',
              `Delivered to ${activeShipment.destination_location}`,
              () => {
                // Reload shipment data
                loadDashboardData();
              }
            );
          } catch (e) {
            console.error('[App] Delivery error:', e.message);
            AlertService.showError('Delivery Failed', e.message, () => {});
          }
        },
        () => {} // Cancel
      );
    } catch (e) {
      console.error('[App] Delivery validation error:', e.message);
      AlertService.showError('Error', e.message, () => {});
    }
  };

  const requestEmergencyDelivery = async () => {
    if (!activeShipment?.id || !driverId || !trackingStatus) return;

    try {
      AlertService.showEmergencyDeliveryConsent(
        async () => {
          try {
            console.log('[App] Requesting emergency delivery...');
            // TODO: Send emergency request to shipper via backend
            // For now, just log it
            console.log('[App] Emergency delivery request sent for shipment:', activeShipment.id);

            AlertService.showSuccess(
              'Request Sent',
              'Shipper will be notified. Awaiting approval...',
              () => {}
            );
          } catch (e) {
            console.error('[App] Emergency request error:', e.message);
            AlertService.showError('Request Failed', e.message, () => {});
          }
        },
        () => {} // Cancel
      );
    } catch (e) {
      console.error('[App] Emergency emergency delivery error:', e.message);
    }
  };

  const renderActiveScreen = () => {
    if (tab === TABS.DASHBOARD) {
      return (
        <DashboardScreen
          shipments={shipments}
          user={user}
          onRefresh={loadDashboardData}
          onFindMatches={findMatches}
          onFindBackhauling={findBackhauling}
        />
      );
    }

    if (tab === TABS.ASSIGNMENTS) {
      return (
        <AssignmentsScreen
          pendingAssignments={pendingAssignments}
          onCheckNew={loadPendingAssignments}
          onOpenDetails={acceptAssignment}
        />
      );
    }

    if (tab === TABS.MATCHING) {
      return <MatchingScreen matches={matches} onAcceptMatch={acceptMatch} />;
    }

    if (tab === TABS.BACKHAULING) {
      return <BackhaulingScreen backhaulOptions={backhaulOptions} />;
    }

    if (tab === TABS.LIVE_TRACKING) {
      return (
        <LiveTrackingScreen
          activeShipment={activeShipment}
          trackingStatus={trackingStatus}
          trackingHistory={trackingHistory}
          statusHistory={statusHistory}
          onMarkPicked={markAsPickedUp}
          onMarkDelivered={markAsDelivered}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Driver Console</Text>
          <Text style={styles.headerSubtitle}>{isLoggedIn ? tab : 'Secure Login'}</Text>
        </View>
        {isLoggedIn && (
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={[styles.btnText, { color: '#ffffff' }]}>Logout</Text>
          </Pressable>
        )}
      </View>

      {!isLoggedIn ? (
        <LoginScreen
          email={email}
          password={password}
          loading={loading}
          error={error}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onLogin={handleLogin}
        />
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content}>
            <KpiStrip
              userFirstName={user?.first_name}
              pendingCount={pendingAssignments.length}
              hasLiveShipment={!!activeShipment}
            />

            {renderActiveScreen()}

            {loading && <ActivityIndicator size="small" color="#4f46e5" style={{ marginTop: 10 }} />}
            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          <BottomTabs tabs={TAB_ORDER} activeTab={tab} onChange={setTab} />

          {/* Enhanced Decision Modal */}
          <ShipmentDecisionModal
            visible={decisionModalVisible}
            shipment={selectedAssignment}
            onAccept={handleDecisionModalAccept}
            onReject={handleDecisionModalReject}
            loading={loading}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

export default AppContent;
