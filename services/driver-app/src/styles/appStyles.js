import { StyleSheet, Platform } from "react-native";

export const colors = {
  background: "#0F1117", // Calm cool slate 50
  surface: "rgba(255, 255, 255, 0.05)",
  primary: "#8B5CF6", // Vibrant Violet/Purple
  primaryLight: "#ffffff", // Lighter Violet
  secondary: "#2DD4BF", // Vibrant Teal
  secondaryLight: "#CFFAFE", // Very soft teal
  success: "#10B981", // Emerald
  danger: "#F43F5E", // Rose
  textMain: "#FFFFFF", // Slate 900
  textMuted: "#9CA3AF", // Slate 500
  textLight: "#CBD5E1", // Slate 300
  border: "rgba(255, 255, 255, 0.1)", // Slate 100
  borderDark: "rgba(255, 255, 255, 0.2)", // Slate 200
  surfaceVariant: "rgba(255, 255, 255, 0.1)", // Slate 100 for subtle contrasting surfaces
};

// Smooth, diffuse modern shadows
export const shadows = {
  soft: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  glow: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  topShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: 24,
    paddingTop: 38,
    paddingBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.background, // Float header seamlessly
  },
  brandPill: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textMain,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: "500",
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: 20,
    fontSize: 16,
    fontWeight: "500",
  },

  loginCard: {
    margin: 24,
    padding: 28,
    backgroundColor: colors.surface,
    borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    ...shadows.medium,
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: colors.surfaceVariant,
    color: colors.textMain,
    fontSize: 16,
    fontWeight: "500",
  },

  tabsScroll: {
    maxHeight: 65,
    marginBottom: 8,
  },
  tabsWrapContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  tabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    gap: 12,
  },
  tabsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "flex-start",
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30, // fully pill shaped
    backgroundColor: colors.surface,
    minWidth: "auto",
    alignItems: "center",
    ...shadows.soft,
  },
  tabBtnCompact: {
    minWidth: 80,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  tabBtnGrid: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: "center",
    backgroundColor: colors.surface,
    ...shadows.soft,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.glow,
  },
  tabText: {
    color: colors.textMuted,
    fontWeight: "600",
    fontSize: 14,
    letterSpacing: -0.2,
  },
  tabTextGrid: { fontSize: 13 },
  tabTextCompact: { fontSize: 13 },
  tabTextActive: { color: "#ffffff", fontWeight: "800", fontSize: 14 },

  content: { padding: 24, gap: 20, paddingBottom: 60 },

  kpiContainer: {
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 20,
    marginBottom: 16,
    ...shadows.glow,
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  kpiDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#FFFFFF40", // semi-transparent white
  },
  kpiCardPrimaryWide: {
    width: "100%",
    flexGrow: 0,
    flexBasis: "100%",
  },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 24,
    paddingHorizontal: 20,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.soft,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.textMuted,
    textAlign: "center",
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.textMain,
    marginTop: 8,
    letterSpacing: -1,
    textAlign: "center",
  },
  kpiLabelLight: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.primaryLight,
    textAlign: "center",
  },
  kpiValueLight: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 8,
    textAlign: "center",
  },

  sectionHeader: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.textMain,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
    fontWeight: "500",
  },
  sectionInfo: {
    fontSize: 15,
    color: colors.secondary,
    marginBottom: 8,
    fontWeight: "700",
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
    marginVertical: 8,
    ...shadows.soft,
  },
  tableRow: {
    backgroundColor: colors.surface,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 16,
    marginVertical: 4,
    flexDirection: "row",
    alignItems: "center",
    ...shadows.soft,
  },
  tableNumBox: {
    backgroundColor: colors.surfaceVariant,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  tableNumText: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.primary,
  },
  tableContent: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: "800",
    color: colors.textMain,
    marginBottom: 8,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  cardMeta: {
    color: colors.textMuted,
    marginBottom: 20,
    fontSize: 15,
    fontWeight: "600",
  },
  routeText: {
    fontWeight: "900",
    color: colors.primary,
    marginBottom: 8,
    fontSize: 18,
    letterSpacing: -0.5,
  },

  rowActions: { flexDirection: "row", gap: 12, alignItems: "center" },
  rowActionsWrap: { flexWrap: "wrap", alignItems: "center" },
  infoColumn: { flex: 1, minWidth: 170 },

  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 16,
    ...shadows.glow,
  },
  secondaryBtn: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    marginBottom: 16,
    ...shadows.soft,
  },
  smallBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  smallBtnAlt: {
    backgroundColor: colors.surfaceVariant,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    flex: 1,
    minWidth: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtn: {
    backgroundColor: colors.danger,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    ...shadows.soft,
  },
  btnText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
  secondaryText: { color: colors.primary, fontWeight: "800", fontSize: 15 },

  helper: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 8,
    fontWeight: "500",
  },
  error: {
    color: colors.danger,
    marginTop: 12,
    fontWeight: "700",
    fontSize: 14,
  },

  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
    ...shadows.soft,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.primary,
    letterSpacing: -0.5,
  },
  closeBtn: {
    fontSize: 28,
    color: colors.textMuted,
    fontWeight: "300",
    padding: 4,
  },
  modalContent: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    paddingBottom: 140,
  },

  sectionBox: {
    backgroundColor: colors.surface,
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    padding: 20,
    marginBottom: 20,
    ...shadows.soft,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.secondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  routeBox: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: colors.secondaryLight,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: "center",
  },
  locationText: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.textMain,
    marginVertical: 4,
  },
  routeArrow: { fontSize: 24, color: colors.secondary, marginVertical: 6 },
  estimateText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    fontWeight: "700",
    marginTop: 4,
  },

  mapPreview: { height: 220, width: "100%", borderRadius: 16, marginTop: 8 },
  liveMap: {
    height: 280,
    width: "100%",
    borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    marginBottom: 16,
    ...shadows.soft,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  detailKey: { fontSize: 15, color: colors.textMuted, fontWeight: "600" },
  detailValue: { fontSize: 15, color: colors.textMain, fontWeight: "800" },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.borderDark,
    paddingVertical: 16,
    marginTop: 8,
  },
  totalKey: { fontSize: 18, color: colors.primary, fontWeight: "900" },
  totalValue: { fontSize: 20, color: colors.primary, fontWeight: "900" },

  actionBox: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    backgroundColor: colors.surface,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...shadows.topShadow,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtn: {
    backgroundColor: colors.surfaceVariant,
  },
  rejectBtnText: { fontSize: 16, fontWeight: "800", color: colors.textMuted },
  acceptBtn: { backgroundColor: colors.primary, ...shadows.glow },
  acceptBtnText: { fontSize: 16, fontWeight: "800", color: "#ffffff" },
});
