import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles/appStyles';

export default function BackhaulingScreen({ backhaulOptions }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Backhaul Options</Text>
      {backhaulOptions.length === 0 ? <Text style={styles.helper}>No options available</Text> : null}
      {backhaulOptions.map((b, idx) => (
        <View key={`${b.vehicle_id}-${idx}`} style={styles.card}>
          <Text style={styles.cardTitle}>Vehicle {b.vehicle_id?.slice(0, 8)}...</Text>
          <Text style={styles.cardMeta}>
            Score: {Number(b.match_score || 0).toFixed(1)} | Bonus: Rs {b.backhauling_bonus || 0}
          </Text>
        </View>
      ))}
    </>
  );
}
