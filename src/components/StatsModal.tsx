import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, BorderRadius, FontFamily } from '../constants/theme';
import { getJots } from '../services/firebase';
import { getJotsCreatedByDay, DayBucket } from '../services/stats';
import { getRetentionStats, RetentionStats } from '../services/analytics';

interface StatsModalProps {
  isVisible: boolean;
  isDark: boolean;
  onClose: () => void;
}

const CHART_HEIGHT = 100;

export default function StatsModal({ isVisible, isDark, onClose }: StatsModalProps) {
  const theme = isDark ? Colors.dark : Colors.light;
  const [loading, setLoading] = useState(true);
  const [buckets, setBuckets] = useState<DayBucket[]>([]);
  const [retention, setRetention] = useState<RetentionStats | null>(null);
  const [totalJots, setTotalJots] = useState(0);

  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [jots, retentionStats] = await Promise.all([getJots(), getRetentionStats()]);
      if (cancelled) return;
      setBuckets(getJotsCreatedByDay(jots, 14));
      setRetention(retentionStats);
      setTotalJots(jots.length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isVisible]);

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.headerBar, { borderBottomColor: theme.border }]}>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Your Stats</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accentText} />
          </View>
        ) : (
          <View style={styles.content}>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>TOTAL JOTS</Text>
              <Text style={[styles.totalCount, { color: theme.text }]}>{totalJots}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>LAST 14 DAYS</Text>
              <View style={styles.chartRow}>
                {buckets.map((bucket) => (
                  <View key={bucket.date} style={styles.barColumn}>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: Math.max(2, (bucket.count / maxCount) * CHART_HEIGHT),
                            backgroundColor: bucket.count > 0 ? theme.accentText : theme.border,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, { color: theme.textMuted }]}>{bucket.label[0]}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardLabel, { color: theme.textMuted }]}>RETENTION</Text>
              <View style={styles.retentionRow}>
                {(['d1', 'd7', 'd30'] as const).map((key, i) => {
                  const hit = retention?.[key] ?? false;
                  const label = ['Day 1', 'Day 7', 'Day 30'][i];
                  return (
                    <View key={key} style={styles.retentionTile}>
                      <View
                        style={[
                          styles.retentionDot,
                          { backgroundColor: hit ? theme.accentText : theme.border },
                        ]}
                      >
                        {hit && <Ionicons name="checkmark" size={14} color={isDark ? Colors.dark.bg : Colors.onAccent} />}
                      </View>
                      <Text style={[styles.retentionLabel, { color: theme.textSecondary }]}>{label}</Text>
                    </View>
                  );
                })}
              </View>
              <Text style={[styles.retentionNote, { color: theme.textMuted }]}>
                {retention ? `${retention.daysSinceInstall} day${retention.daysSinceInstall === 1 ? '' : 's'} since you installed Jot` : ''}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  cardLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  totalCount: {
    fontFamily: FontFamily.display,
    fontSize: FontSize.display,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT + 20,
    marginTop: Spacing.sm,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  barTrack: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 6,
    borderRadius: BorderRadius.sm,
  },
  barLabel: {
    fontSize: 9,
  },
  retentionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  retentionTile: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  retentionDot: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retentionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  retentionNote: {
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
