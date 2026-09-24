import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  ADS_DIAGNOSTICS_ENABLED,
  getAdDiagnostics,
  subscribeAdDiagnostics,
  AdDiagnostic,
} from "../services/ads";
import { Colors } from "../constants/theme";

interface AdDiagnosticsOverlayProps {
  isDark?: boolean;
  visible?: boolean;
  onClose?: () => void;
}

const AdDiagnosticsOverlay: React.FC<AdDiagnosticsOverlayProps> = ({
  isDark,
  visible,
  onClose,
}) => {
  const [entries, setEntries] = useState<AdDiagnostic[]>(() => getAdDiagnostics());

  useEffect(() => {
    const unsubscribe = subscribeAdDiagnostics(() => {
      setEntries(getAdDiagnostics());
    });
    return unsubscribe;
  }, []);

  const show = visible === undefined ? ADS_DIAGNOSTICS_ENABLED : visible;
  if (!show) return null;

  const c = isDark ? Colors.dark : Colors.light;

  return (
    <View pointerEvents={onClose ? "box-none" : "none"} style={styles.overlay}>
      <Pressable onPress={onClose} style={styles.titleRow}>
        <Text style={[styles.title, { color: c.text }]}>
          Ads diagnostics ({entries.length})
        </Text>
        {onClose && <Text style={[styles.title, { color: c.textMuted }]}>tap to close</Text>}
      </Pressable>
      {entries.slice(-8).map((e, i) => (
        <Text
          key={i}
          numberOfLines={3}
          style={[
            styles.line,
            { color: c.textMuted },
            e.level === "error" && { color: "#ff6b6b" },
            e.level === "warn" && { color: "#ffd93d" },
          ]}
        >
          [{e.time}] {e.message}
        </Text>
      ))}
      {entries.length === 0 && <Text style={[styles.line, { color: c.textMuted }]}>no events yet</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    left: 4,
    right: 4,
    bottom: 4,
    zIndex: 99999,
    backgroundColor: "rgba(0,0,0,0.78)",
    borderRadius: 8,
    padding: 6,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
  },
  line: {
    fontSize: 10,
    marginVertical: 1,
  },
});

export default AdDiagnosticsOverlay;