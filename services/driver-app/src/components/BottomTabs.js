import React from "react";
import {
  View,
  Pressable,
  Text,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, shadows } from "../styles/appStyles";
import { TABS, TAB_ORDER } from "../constants/tabs";

const ICON_MAP = {
  [TABS.DASHBOARD]: "home",
  [TABS.ASSIGNMENTS]: "clipboard",
  [TABS.LIVE_TRACKING]: "navigate",
  [TABS.MATCHING]: "swap-horizontal",
  [TABS.BACKHAULING]: "repeat",
};

export default function BottomTabs({ tabs, activeTab, onChange }) {
  const { width } = useWindowDimensions();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Platform.OS === "ios" ? 24 : 16 },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        const iconName = ICON_MAP[tab] || "ellipse";

        return (
          <Pressable
            key={tab}
            onPress={() => onChange(tab)}
            style={styles.tabBtn}
          >
            <View
              style={[
                styles.iconContainer,
                isActive && styles.iconContainerActive,
              ]}
            >
              <Ionicons
                name={isActive ? iconName : `${iconName}-outline`}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
              />
            </View>
            <Text
              style={[styles.tabText, isActive && styles.tabTextActive]}
              numberOfLines={1}
            >
              {tab.split(" ")[0]}{" "}
              {/* Shorten "Live Tracking" to "Live" mostly, or just let it scale */}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    ...shadows.medium,
    // Add shadow pointing up
    shadowOffset: { width: 0, height: -4 },
  },
  tabBtn: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  iconContainerActive: {
    backgroundColor: colors.primary + "15",
  },
  tabText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: "600",
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: "800",
  },
});
