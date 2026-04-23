import React from 'react';
import { Text, Pressable, View } from 'react-native';
import { styles } from '../styles/appStyles';

const pct = (value) => {
  const n = Number(value || 0);
  return n <= 1 ? n * 100 : n;
};

export default function MatchingScreen({ matches, onAcceptMatch }) {
  return (
    <>
      <Text style={styles.sectionTitle}>Matches</Text>
      <View style={{ marginTop: 8 }}>
        {matches.length === 0 ? <Text style={styles.helper}>Pick a shipment from Dashboard</Text> : null}
        {matches.map((m, idx) => (
          <View key={`${m.vehicle_id}-${idx}`} style={styles.tableRow}>
            <View style={styles.tableNumBox}>
              <Text style={styles.tableNumText}>{idx + 1}</Text>
            </View>
            <View style={styles.tableContent}>
              <Text style={styles.cardTitle}>Matched Vehicle</Text>
              <Text style={styles.cardMeta}>
                Final: {pct(m.match_score).toFixed(1)}% | Rule: {pct(m.rule_score ?? m.match_score).toFixed(1)}%
                {m.ml_score != null ? ` | ML: ${pct(m.ml_score).toFixed(1)}%${m.confidence != null ? ` (±${(m.confidence * 100).toFixed(0)}%)` : ''}` : ''}
              </Text>
              <Text style={styles.helper}>Source: {m.score_source || 'rules'} | Rs {m.estimated_cost || 0}</Text>
              {m.explanation && <Text style={styles.helper}>💡 {m.explanation}</Text>}
              <Pressable style={[styles.smallBtn, { marginTop: 12 }]} onPress={() => onAcceptMatch(m)}>
                <Text style={styles.btnText}>Accept</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
