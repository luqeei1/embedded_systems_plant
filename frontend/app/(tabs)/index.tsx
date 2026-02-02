import { StyleSheet, View, FlatList, Pressable } from 'react-native';
import { useState } from 'react';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MetricCard from '@/components/ui/metric-card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const metrics = [
  { id: 'moisture', label: 'Soil Moisture', value: 62, unit: '%', colorA: '#3DDC84', colorB: '#1B8F6B', icon: 'water', min: 40, max: 80, status: 'good' },
  { id: 'light', label: 'Light Intensity', value: 7200, unit: 'lux', colorA: '#FFF176', colorB: '#F9A825', icon: 'sun', min: 5000, max: 10000, status: 'good' },
  { id: 'temperature', label: 'Temperature', value: 23.4, unit: '°C', colorA: '#FF8A65', colorB: '#D84315', icon: 'thermometer', min: 18, max: 28, status: 'good' },
  { id: 'humidity', label: 'Humidity', value: 48, unit: '%', colorA: '#80DEEA', colorB: '#00ACC1', icon: 'cloud.drizzle', min: 40, max: 70, status: 'warning' },
];

const recommendations = [
  { id: 1, text: 'Water soil when below 40%', icon: 'water-alert' },
  { id: 2, text: 'Ensure 6+ hours of sunlight daily', icon: 'sun-clock' },
  { id: 3, text: 'Humidity is a bit low - consider misting', icon: 'spray-bottle' },
];

const getStatusColor = (status: string) => {
  switch(status) {
    case 'good': return '#10B981';
    case 'warning': return '#F59E0B';
    case 'critical': return '#EF4444';
    default: return '#6B7280';
  }
};

export default function HomeScreen() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  return (
    <ThemedView style={styles.container}>
      <Animated.View entering={FadeInDown.delay(100).duration(500)}>
        <View style={styles.headerSection}>
          <ThemedText type="title" style={styles.header}>Plant Health</ThemedText>
          <View style={styles.statusBadge}>
            <MaterialCommunityIcons name="leaf" size={16} color="#10B981" />
            <ThemedText style={styles.statusText}>Mostly Healthy</ThemedText>
          </View>
        </View>
      </Animated.View>

      <FlatList
        data={metrics}
        keyExtractor={(item, idx) => `${item.id}-${idx}`}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 80).duration(500)}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedMetric(selectedMetric === item.id ? null : item.id);
              }}
              style={styles.cardWrapper}
            >
              <MetricCard 
                label={item.label} 
                value={item.value} 
                unit={item.unit} 
                colorA={item.colorA} 
                colorB={item.colorB} 
                icon={item.icon}
                status={item.status}
              />
            </Pressable>
            {selectedMetric === item.id && (
              <Animated.View entering={FadeInDown.duration(300)} style={styles.detailPanel}>
                <View style={styles.detailRow}>
                  <ThemedText style={styles.detailLabel}>Range</ThemedText>
                  <ThemedText style={styles.detailValue}>{item.min} - {item.max} {item.unit}</ThemedText>
                </View>
                <View style={[styles.detailRow, styles.lastRow]}>
                  <ThemedText style={styles.detailLabel}>Status</ThemedText>
                  <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) }]}>
                    <ThemedText style={styles.statusPillText}>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</ThemedText>
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        )}
        numColumns={1}
        contentContainerStyle={styles.list}
        scrollEnabled={true}
        ListFooterComponent={
          <Animated.View entering={FadeInUp.delay(400).duration(500)}>
            <View style={styles.recommendationSection}>
              <ThemedText style={styles.recommendationTitle}>Care Tips</ThemedText>
              {recommendations.map((rec, idx) => (
                <View key={rec.id} style={[styles.recommendationItem, idx < recommendations.length - 1 && styles.recommendationItemBorder]}>
                  <MaterialCommunityIcons name={rec.icon as any} size={18} color="#8B5CF6" />
                  <ThemedText style={styles.recommendationText}>{rec.text}</ThemedText>
                </View>
              ))}
            </View>
          </Animated.View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerSection: {
    marginBottom: 32,
    gap: 10,
  },
  header: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  list: {
    gap: 0,
    paddingBottom: 40,
  },
  cardWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  detailPanel: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 14,
    padding: 14,
    marginTop: -4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  lastRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    paddingTop: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  recommendationSection: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    color: '#8B5CF6',
  },
  recommendationItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  recommendationItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.2)',
  },
  recommendationText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
