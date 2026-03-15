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
import TopTabs from './src/components/TopTabs';
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
  const [email, setEmail] = useState('driver1@looplink.com');
  const [password, setPassword] = useState('driver123');
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
    if (!isLoggedIn || tab !== TABS.LIVE_TRACKING || !activeShipment?.id) return;

    const loadLiveTracking = async () => {
      try {
        const [statusRes, historyRes, statusTimelineRes] = await Promise.all([
          api.getTrackingStatus(activeShipment.id),
          api.getTrackingHistory(activeShipment.id),
          api.getStatusHistory(activeShipment.id).catch(() => ({ events: [] })),
        ]);

        setTrackingStatus(statusRes || null);
        setTrackingHistory(historyRes?.events || []);
        setStatusHistory(statusTimelineRes?.events || []);
      } catch (e) {
        console.warn('[App] Live tracking fetch failed:', e.message);
      }
    };

    loadLiveTracking();
    const intervalId = setInterval(loadLiveTracking, 5000);
    return () => clearInterval(intervalId);
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
      await api.recordPickupEvent(activeShipment.id, {
        driver_id: driverId,
        location: activeShipment.source_location,
        latitude: trackingStatus.latitude,
        longitude: trackingStatus.longitude,
      });
    } catch (e) {
      setError(e.message);
    }
  };

  const markAsDelivered = async () => {
    if (!activeShipment?.id || !driverId || !trackingStatus) return;
    try {
      await api.recordDeliveryEvent(activeShipment.id, {
        driver_id: driverId,
        location: activeShipment.destination_location,
        latitude: trackingStatus.latitude,
        longitude: trackingStatus.longitude,
        proof_image: '',
      });
    } catch (e) {
      setError(e.message);
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
          <Text style={styles.brandPill}>LOOPLINK COLD CHAIN</Text>
          <Text style={styles.headerTitle}>Driver Console</Text>
          <Text style={styles.headerSubtitle}>{isLoggedIn ? tab : 'Secure Login'}</Text>
        </View>
        {isLoggedIn && (
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <Text style={styles.btnText}>Logout</Text>
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
        <>
          <TopTabs tabs={TAB_ORDER} activeTab={tab} onChange={setTab} />

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

          {/* Enhanced Decision Modal */}
          <ShipmentDecisionModal
            visible={decisionModalVisible}
            shipment={selectedAssignment}
            onAccept={handleDecisionModalAccept}
            onReject={handleDecisionModalReject}
            loading={loading}
          />
        </>
      )}
    </SafeAreaView>
  );
}

export default AppContent;
