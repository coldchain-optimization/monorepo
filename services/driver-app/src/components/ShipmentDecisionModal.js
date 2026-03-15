import React from 'react';
import {
  Modal,
  SafeAreaView,
  View,
  Text,
  Pressable,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { styles } from '../styles/appStyles';
import { getCoordsFromLocation, buildWaypoints, approxDistanceKm } from '../utils/geo';

export default function ShipmentDecisionModal({ visible, shipment, onAccept, onReject, loading }) {
  if (!shipment) return null;

  const origin = getCoordsFromLocation(shipment.source_location, `${shipment.id}-src`);
  const destination = getCoordsFromLocation(shipment.destination_location, `${shipment.id}-dst`);
  const waypoints = buildWaypoints(origin, destination, 4);
  const routeCoordinates = [origin, ...waypoints, destination];
  const distanceKm = approxDistanceKm(origin, destination);

  const center = {
    latitude: (origin.latitude + destination.latitude) / 2,
    longitude: (origin.longitude + destination.longitude) / 2,
    latitudeDelta: Math.max(Math.abs(origin.latitude - destination.latitude) * 1.8, 3),
    longitudeDelta: Math.max(Math.abs(origin.longitude - destination.longitude) * 1.8, 3),
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onReject}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Shipment Details</Text>
          <Pressable onPress={onReject}>
            <Text style={styles.closeBtn}>x</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent}>
          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>ROUTE</Text>
            <View style={styles.routeBox}>
              <Text style={styles.locationText}>{shipment.source_location}</Text>
              <Text style={styles.routeArrow}>↓</Text>
              <Text style={styles.locationText}>{shipment.destination_location}</Text>
            </View>
            <Text style={styles.estimateText}>Est. Distance: {distanceKm} km | Time: ~6 hrs</Text>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>ROUTE MAP</Text>
            <MapView
              style={styles.mapPreview}
              initialRegion={center}
              key={`${shipment.id}-${shipment.source_location}-${shipment.destination_location}`}
            >
              <Marker coordinate={origin} title="Pickup" description={shipment.source_location} pinColor="green" />
              <Marker coordinate={destination} title="Drop" description={shipment.destination_location} pinColor="red" />
              <Polyline coordinates={routeCoordinates} strokeColor="#4f46e5" strokeWidth={4} />
            </MapView>
          </View>

          <View style={styles.sectionBox}>
            <Text style={styles.sectionLabel}>CARGO DETAILS</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Type:</Text>
              <Text style={styles.detailValue}>{shipment.load_type || 'General'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Weight:</Text>
              <Text style={styles.detailValue}>{shipment.load_weight || 0} kg</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Volume:</Text>
              <Text style={styles.detailValue}>{shipment.load_volume || 0} m3</Text>
            </View>
          </View>

          <View style={styles.actionBox}>
            <Pressable style={[styles.actionBtn, styles.rejectBtn]} onPress={onReject} disabled={loading}>
              <Text style={styles.rejectBtnText}>Decline</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.acceptBtn]} onPress={onAccept} disabled={loading}>
              <Text style={styles.acceptBtnText}>{loading ? 'Accepting...' : 'Accept Assignment'}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
