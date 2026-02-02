import React from 'react';
import { StyleSheet, View, Pressable, Modal, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';

type DetailModalProps = {
  visible: boolean;
  onClose: () => void;
  metric: {
    label: string;
    value: number;
    unit: string;
    colorA: string;
    colorB: string;
    icon: string;
    min: number;
    max: number;
    status: 'good' | 'warning' | 'critical';
  } | null;
};

const { height } = Dimensions.get('window');

export default function DetailModal({ visible, onClose, metric }: DetailModalProps) {
  if (!metric) return null;

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'good': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'good': return 'Optimal';
      case 'warning': return 'Caution';
      case 'critical': return 'Critical';
    }
  };

  const inRange = metric.value >= metric.min && metric.value <= metric.max;
  const progress = Math.min(100, (metric.value / metric.max) * 100);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(300)} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View entering={SlideInUp.duration(400).springify()} style={styles.modalContainer}>
          <LinearGradient colors={[metric.colorA, metric.colorB]} start={[0, 0]} end={[1, 1]} style={styles.header}>
            <View style={styles.headerTop}>
              <MaterialCommunityIcons name={metric.icon as any} size={48} color="white" />
              <Pressable onPress={onClose} style={styles.closeButton}>
                <MaterialCommunityIcons name="close" size={28} color="white" />
              </Pressable>
            </View>
            <View style={styles.headerContent}>
              <ThemedText style={styles.metricLabel}>{metric.label}</ThemedText>
              <View style={styles.valueContainer}>
                <ThemedText style={styles.largeValue}>{metric.value}</ThemedText>
                <ThemedText style={styles.unitLarge}>{metric.unit}</ThemedText>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.content}>
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Status</ThemedText>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(metric.status) }]}>
                <MaterialCommunityIcons 
                  name={metric.status === 'good' ? 'check-circle' : metric.status === 'warning' ? 'alert-circle' : 'alert'} 
                  size={20} 
                  color="white" 
                />
                <ThemedText style={styles.statusBadgeText}>{getStatusLabel(metric.status)}</ThemedText>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Range</ThemedText>
              <View style={styles.rangeContainer}>
                <View style={styles.rangeItem}>
                  <ThemedText style={styles.rangeLabel}>Min</ThemedText>
                  <ThemedText style={styles.rangeValue}>{metric.min}</ThemedText>
                </View>
                <View style={styles.rangeDivider} />
                <View style={styles.rangeItem}>
                  <ThemedText style={styles.rangeLabel}>Current</ThemedText>
                  <ThemedText style={[styles.rangeValue, { color: inRange ? '#10B981' : '#EF4444' }]}>{metric.value}</ThemedText>
                </View>
                <View style={styles.rangeDivider} />
                <View style={styles.rangeItem}>
                  <ThemedText style={styles.rangeLabel}>Max</ThemedText>
                  <ThemedText style={styles.rangeValue}>{metric.max}</ThemedText>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Progress</ThemedText>
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <LinearGradient 
                    colors={[metric.colorA, metric.colorB]} 
                    start={[0, 0]} 
                    end={[1, 0]}
                    style={[styles.progressBar, { width: `${progress}%` }]} 
                  />
                </View>
                <ThemedText style={styles.progressPercent}>{Math.round(progress)}%</ThemedText>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>In Optimal Range?</ThemedText>
              <View style={[styles.inRangeBanner, { backgroundColor: inRange ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                <MaterialCommunityIcons 
                  name={inRange ? 'check-circle' : 'close-circle'} 
                  size={24} 
                  color={inRange ? '#10B981' : '#EF4444'} 
                />
                <ThemedText style={[styles.inRangeText, { color: inRange ? '#10B981' : '#EF4444' }]}>
                  {inRange ? 'Yes - Plant is happy!' : 'No - Needs adjustment'}
                </ThemedText>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.85,
    overflow: 'hidden',
  },
  header: {
    padding: 24,
    paddingBottom: 32,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    gap: 12,
  },
  metricLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  largeValue: {
    fontSize: 48,
    fontWeight: '800',
    color: 'white',
    letterSpacing: -1,
  },
  unitLarge: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  rangeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  rangeItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  rangeDivider: {
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.6,
    marginBottom: 4,
  },
  rangeValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressContainer: {
    gap: 10,
  },
  progressBackground: {
    height: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  inRangeBanner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  inRangeText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});
