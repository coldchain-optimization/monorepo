import React from "react";
import { Text, Pressable, View } from "react-native";
import { styles } from "../styles/appStyles";

export default function AssignmentsScreen({
  pendingAssignments,
  onCheckNew,
  onOpenDetails,
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>Admin Assignments</Text>
      <Text style={styles.sectionInfo}>
        {pendingAssignments.length} waiting for your decision
      </Text>
      <Pressable style={styles.secondaryBtn} onPress={onCheckNew}>
        <Text style={styles.secondaryText}>Check for New</Text>
      </Pressable>

      <View style={{ marginTop: 8 }}>
        {pendingAssignments.length === 0 ? (
          <Text style={styles.helper}>No pending assignments</Text>
        ) : null}

        {pendingAssignments.map((a, index) => (
          <View key={a.id} style={styles.tableRow}>
            <View style={styles.tableNumBox}>
              <Text style={styles.tableNumText}>{index + 1}</Text>
            </View>
            <View style={styles.tableContent}>
              <Text style={styles.routeText}>
                {a.source_location} {"->"} {a.destination_location}
              </Text>
              <Text style={styles.cardMeta}>
                {a.load_type} | {a.load_weight}kg | Temp: {a.required_temp || "N/A"}
                C
              </Text>
              <View style={[styles.rowActions, styles.rowActionsWrap]}>
                <View style={styles.infoColumn}>
                  <Text style={[styles.cardMeta, { marginBottom: 3 }]}>
                    Cost: Rs {a.estimated_cost || 0}
                  </Text>
                  <Text style={[styles.cardMeta, { marginBottom: 0 }]}>
                    Assigned Vehicle: {a.assigned_vehicle?.slice(0, 8)}...
                  </Text>
                </View>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => onOpenDetails(a)}
                >
                  <Text style={[styles.btnText, { textAlign: "center" }]}>
                    Details
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}
