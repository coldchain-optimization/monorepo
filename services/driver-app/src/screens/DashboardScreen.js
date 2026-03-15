import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { styles } from '../styles/appStyles';

export default function DashboardScreen({ shipments, user, onRefresh, onFindMatches, onFindBackhauling }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Hello, {user?.first_name || 'Driver'}</Text>
      <Text style={styles.sectionInfo}>Available: {shipments.length}</Text>
      <Pressable style={styles.secondaryBtn} onPress={onRefresh}>
        <Text style={styles.secondaryText}>Refresh</Text>
      </Pressable>

      {shipments.map((s) => (
        <View key={s.id} style={styles.card}>
          <Text style={styles.routeText}>{s.source_location} {'->'} {s.destination_location}</Text>
          <Text style={styles.cardMeta}>
            {s.load_type} | {s.load_weight}kg | Rs {s.estimated_cost || 0}
          </Text>
          <View style={[styles.rowActions, styles.rowActionsWrap]}>
            <Pressable style={styles.smallBtn} onPress={() => onFindMatches(s.id)}>
              <Text style={styles.btnText}>Find</Text>
            </Pressable>
            <Pressable style={styles.smallBtnAlt} onPress={() => onFindBackhauling(s.id)}>
              <Text style={styles.secondaryText}>Backhaul</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </>
  );
}
