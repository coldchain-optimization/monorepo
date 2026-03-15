import React from 'react';
import { Text, Pressable, View, useWindowDimensions } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { styles } from '../styles/appStyles';
import { getCoordsFromLocation } from '../utils/geo';

export default function LiveTrackingScreen({
  activeShipment,
  trackingStatus,
  trackingHistory,
  statusHistory,
  onMarkPicked,
  onMarkDelivered,
}) {
  const { width } = useWindowDimensions();
  const mapHeight = width < 390 ? 220 : 260;

  return (
    <>
      <Text style={styles.sectionTitle}>Live Tracking</Text>
      {!activeShipment ? (
        <Text style={styles.helper}>Accept an assignment to start live tracking.</Text>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.routeText}>{activeShipment.source_location} {'->'} {activeShipment.destination_location}</Text>
            <Text style={styles.cardMeta}>Shipment ID: {activeShipment.id?.slice(0, 12)}...</Text>
          </View>

          {trackingStatus ? (
            <View style={styles.card}>
              <MapView
                style={[styles.liveMap, { height: mapHeight }]}
                initialRegion={{
                  latitude: trackingStatus.latitude,
                  longitude: trackingStatus.longitude,
                  latitudeDelta: 5,
                  longitudeDelta: 5,
                }}
                key={`${activeShipment.id}-${trackingStatus.latitude}-${trackingStatus.longitude}`}
              >
                <Marker
                  coordinate={{
                    latitude: trackingStatus.latitude,
                    longitude: trackingStatus.longitude,
                  }}
                  title="Current Vehicle Location"
                  pinColor="blue"
                />
                <Marker
                  coordinate={getCoordsFromLocation(activeShipment.source_location, `${activeShipment.id}-src`)}
                  title="Pickup"
                  pinColor="green"
                />
                <Marker
                  coordinate={getCoordsFromLocation(activeShipment.destination_location, `${activeShipment.id}-dst`)}
                  title="Destination"
                  pinColor="red"
                />
                <Polyline
                  coordinates={[
                    getCoordsFromLocation(activeShipment.source_location, `${activeShipment.id}-src`),
                    ...(trackingHistory || []).map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
                    getCoordsFromLocation(activeShipment.destination_location, `${activeShipment.id}-dst`),
                  ]}
                  strokeColor="#4f46e5"
                  strokeWidth={4}
                />
              </MapView>

              <Text style={styles.cardMeta}>Status: {trackingStatus.status}</Text>
              <Text style={styles.cardMeta}>Speed: {Math.round(trackingStatus.speed || 0)} km/h</Text>
              <Text style={styles.cardMeta}>Temp: {trackingStatus.temperature}C</Text>
              <Text style={styles.cardMeta}>ETA: {new Date(trackingStatus.estimated_arrival).toLocaleTimeString()}</Text>

              <View style={styles.rowActions}>
                <Pressable style={styles.smallBtnAlt} onPress={onMarkPicked}>
                  <Text style={styles.secondaryText}>Mark Picked</Text>
                </Pressable>
                <Pressable style={styles.smallBtn} onPress={onMarkDelivered}>
                  <Text style={styles.btnText}>Mark Delivered</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Text style={styles.helper}>Loading live location...</Text>
          )}

          {statusHistory.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Status Timeline</Text>
              {statusHistory.map((e) => (
                <Text key={e.id} style={styles.cardMeta}>
                  - {e.status} @ {e.location} ({new Date(e.created_at).toLocaleTimeString()})
                </Text>
              ))}
            </View>
          ) : null}
        </>
      )}
    </>
  );
}
