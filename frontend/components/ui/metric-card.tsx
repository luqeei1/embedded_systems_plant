import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';

type Props = {
  label: string;
  value: number;
  unit: string;
  colorA: string;
  colorB: string;
  icon: string;
  status?: 'good' | 'warning' | 'critical';
};

export default function MetricCard({ label, value, unit, colorA, colorB, icon, status = 'good' }: Props) {
  const percent = Math.max(0, Math.min(100, typeof value === 'number' ? Math.round((value % 100) as number) : 0));
  const getStatusDot = () => {
    switch(status) {
      case 'good': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
    }
  };
  return (
    <LinearGradient colors={[colorA, colorB]} start={[0, 0]} end={[1, 1]} style={styles.gradient}>
      <View style={[styles.statusDot, { backgroundColor: getStatusDot() }]} />
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon as any} size={28} color="rgba(255,255,255,0.95)" />
        </View>
        <View style={styles.content}>
          <ThemedText type="subtitle" style={styles.label}>{label}</ThemedText>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{typeof value === 'number' ? value : String(value)}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>
          <View style={styles.progressBackground}>
            <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: 'rgba(255,255,255,0.28)' }]} />
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 20,
    padding: 20,
    minHeight: 140,
    justifyContent: 'center',
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  label: {
    color: 'rgba(255,255,255,0.88)',
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 32,
    color: 'white',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  progressBackground: {
    marginTop: 14,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
