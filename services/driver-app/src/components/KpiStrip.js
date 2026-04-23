import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles/appStyles';

export default function KpiStrip({ userFirstName, pendingCount, hasLiveShipment }) {
  return (
    <View style={styles.kpiContainer}>
      <View style={styles.kpiSection}>
        <Text style={styles.kpiLabelLight}>DRIVER</Text>
        <Text style={styles.kpiValueLight} numberOfLines={1}>{userFirstName || 'Online'}</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={styles.kpiSection}>
        <Text style={styles.kpiLabelLight}>PENDING</Text>
        <Text style={styles.kpiValueLight}>{pendingCount}</Text>
      </View>
      <View style={styles.kpiDivider} />
      <View style={styles.kpiSection}>
        <Text style={styles.kpiLabelLight}>LIVE</Text>
        <Text style={styles.kpiValueLight}>{hasLiveShipment ? '1' : '0'}</Text>
      </View>
    </View>
  );
}
