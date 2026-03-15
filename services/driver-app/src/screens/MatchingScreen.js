import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { styles } from '../styles/appStyles';

export default function MatchingScreen({ matches, onAcceptMatch }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Matches</Text>
      {matches.length === 0 ? <Text style={styles.helper}>Pick a shipment from Dashboard</Text> : null}
      {matches.map((m, idx) => (
        <View key={`${m.vehicle_id}-${idx}`} style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle {m.vehicle_id?.slice(0, 8)}...</Text>
          <Text style={styles.cardMeta}>
            Score: {Number(m.match_score || 0).toFixed(1)} | Rs {m.estimated_cost || 0}
          </Text>
          <Pressable style={styles.smallBtn} onPress={() => onAcceptMatch(m)}>
            <Text style={styles.btnText}>Accept</Text>
          </Pressable>
        </View>
      ))}
    </>
  );
}
