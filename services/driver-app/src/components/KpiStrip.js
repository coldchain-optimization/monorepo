import React from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { styles } from '../styles/appStyles';

export default function KpiStrip({ userFirstName, pendingCount, hasLiveShipment }) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;

  return (
    <View style={[styles.kpiRow, isNarrow && styles.kpiRowWrap]}>
      <View style={[styles.kpiCardPrimary, isNarrow && styles.kpiCardPrimaryWide]}>
        <Text style={styles.kpiLabelLight}>ONLINE DRIVER</Text>
        <Text style={styles.kpiValueLight}>{userFirstName || 'Driver'}</Text>
      </View>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>PENDING</Text>
        <Text style={styles.kpiValue}>{pendingCount}</Text>
      </View>
      <View style={styles.kpiCard}>
        <Text style={styles.kpiLabel}>LIVE</Text>
        <Text style={styles.kpiValue}>{hasLiveShipment ? '1' : '0'}</Text>
      </View>
    </View>
  );
}
