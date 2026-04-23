import React from 'react';
import { Text, View } from 'react-native';
import { styles } from '../styles/appStyles';

const pct = (value) => {
  const n = Number(value || 0);
  return n <= 1 ? n * 100 : n;
};

export default function BackhaulingScreen({ backhaulOptions }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Backhaul Options</Text>
      <View style={{ marginTop: 8 }}>
        {backhaulOptions.length === 0 ? <Text style={styles.helper}>No options available</Text> : null}
        {backhaulOptions.map((b, idx) => (
          <View key={`${b.vehicle_id}-${idx}`} style={styles.tableRow}>
            <View style={styles.tableNumBox}>
              <Text style={styles.tableNumText}>{idx + 1}</Text>
            </View>
            <View style={styles.tableContent}>
              <Text style={styles.cardTitle}>Backhaul Vehicle</Text>
              <Text style={styles.cardMeta}>
                Final: {pct(b.match_score).toFixed(1)}% | Rule: {pct(b.rule_score ?? b.match_score).toFixed(1)}%
                {b.ml_score != null ? ` | ML: ${pct(b.ml_score).toFixed(1)}%${b.confidence != null ? ` (±${(b.confidence * 100).toFixed(0)}%)` : ''}` : ''}
              </Text>
              <Text style={styles.helper}>Source: {b.score_source || 'rules'} | Bonus: Rs {b.backhauling_bonus || 0}</Text>
              {b.explanation && <Text style={styles.helper}>💡 {b.explanation}</Text>}
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
