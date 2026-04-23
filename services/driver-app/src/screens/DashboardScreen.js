import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { styles } from '../styles/appStyles';

export default function DashboardScreen({ shipments, user, onRefresh, onFindMatches, onFindBackhauling }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Shipments</Text>
        <Text style={styles.sectionSubtitle}>
          There are {shipments.length} loads waiting for a driver.
        </Text>
      </View>
      <Pressable style={styles.secondaryBtn} onPress={onRefresh}>
        <Text style={styles.secondaryText}>Refresh</Text>
      </Pressable>

      <View style={{ marginTop: 8 }}>
        {shipments.map((s, index) => (
          <View key={s.id} style={styles.tableRow}>
            <View style={styles.tableNumBox}>
              <Text style={styles.tableNumText}>{index + 1}</Text>
            </View>
            <View style={styles.tableContent}>
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
          </View>
        ))}
      </View>
    </>
  );
}
