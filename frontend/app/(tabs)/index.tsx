import { StyleSheet, View, Pressable, Modal, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { useState, useRef } from 'react';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import MetricCard from '@/components/ui/metric-card';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { createClient } from '@supabase/supabase-js';
import useSensorData from '@/hooks/use-sensor-data';

// --- CONFIG ---
const supabaseUrl = 'https://xjufkkzlppxvxbkgsqye.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdWZra3pscHB4dnhia2dzcXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDQ5NTIsImV4cCI6MjA4NTYyMDk1Mn0.tclAzVQhrjKJl3B9yqDzqjNjak55OQBTg9JfF-eH32k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type MetricCategory = 'climate' | 'soil' | 'light';

type Metric = {
  id: string;
  category: MetricCategory;
  label: string;
  value: number;
  unit: string;
  colorA: string;
  colorB: string;
  icon: string;
  min: number;
  max: number;
};

const GLOSSARY = [
  { id: '1', term: 'PPFD', definition: 'Photosynthetic Photon Flux Density. Measures actual light particles reaching the plant.' },
  { id: '2', term: 'VPD', definition: 'Vapor Pressure Deficit. Measures the atmospheric "thirst" that pulls water through the plant.' },
  { id: '3', term: 'Quality Index', definition: "Efficiency of the light spectrum at driving photosynthesis (0.0 - 1.0)." },
  { id: '4', term: 'R:B Ratio', definition: 'Red-to-Blue ratio. Higher Red helps flowering; higher Blue helps vegetative bushiness.' }
];

const metricsConfig: Metric[] = [
  { id: 'temperature', category: 'climate', label: 'Air Temp', value: 0, unit: '°C', colorA: '#FF8A65', colorB: '#D84315', icon: 'thermometer', min: 18, max: 28 },
  { id: 'humidity', category: 'climate', label: 'Air Humidity', value: 0, unit: '%', colorA: '#80DEEA', colorB: '#00ACC1', icon: 'cloud-percent', min: 40, max: 75 },
  { id: 'vpd', category: 'climate', label: 'VPD', value: 0, unit: 'kPa', colorA: '#A78BFA', colorB: '#7C3AED', icon: 'gauge', min: 0.4, max: 1.6 },
  { id: 'moisture', category: 'soil', label: 'Soil Moisture', value: 0, unit: '%', colorA: '#3DDC84', colorB: '#1B8F6B', icon: 'water', min: 35, max: 80 },
  { id: 'ppfd', category: 'light', label: 'PPFD', value: 0, unit: 'μmol', colorA: '#FFF176', colorB: '#F9A825', icon: 'sun', min: 100, max: 1200 },
  { id: 'quality_index', category: 'light', label: 'Quality Index', value: 0, unit: 'eff', colorA: '#F472B6', colorB: '#DB2777', icon: 'leaf-circle', min: 0.7, max: 1.0 },
  { id: 'red_blue_ratio', category: 'light', label: 'R:B Ratio', value: 0, unit: ':1', colorA: '#60A5FA', colorB: '#2563EB', icon: 'chart-scatter-plot', min: 0.5, max: 2.5 },
];

export default function HomeScreen() {
  const [expandedCats, setExpandedCats] = useState<Record<MetricCategory, boolean>>({
    climate: true, soil: true, light: true
  });
  const [cameraVisible, setCameraVisible] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [speciesName, setSpeciesName] = useState(''); // New state for input
  const [isUploading, setIsUploading] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { data: sensorData, connected } = useSensorData();

  const toggleCategory = (cat: MetricCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getCategorizedMetrics = () => {
    const categories: Record<MetricCategory, (Metric & { status: string })[]> = {
      climate: [], soil: [], light: []
    };

    metricsConfig.forEach(m => {
      let value = m.value;
      if (sensorData) {
        if (m.category === 'climate' && sensorData.climate) value = sensorData.climate[m.id as keyof typeof sensorData.climate] ?? 0;
        if (m.category === 'soil' && sensorData.soil) value = sensorData.soil.moisture ?? 0;
        if (m.category === 'light' && sensorData.light) value = sensorData.light[m.id as keyof typeof sensorData.light] ?? 0;
      }
      const status = (value < m.min || value > m.max) ? 'warning' : 'good';
      categories[m.category].push({ ...m, value, status });
    });
    return categories;
  };

  const categorizedData = getCategorizedMetrics();

  const handleCameraPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    setPreviewImage(null);
    setSpeciesName(''); // Reset name when opening camera
    setCameraVisible(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 }); 
        if (photo) setPreviewImage(photo.uri);
      } catch (e) { console.error("Capture Error:", e); }
    }
  };

  const uploadAndSavePlant = async () => {
    if (!previewImage) return;
    if (!speciesName.trim()) {
      Alert.alert("Wait!", "Please provide a name for this specimen.");
      return;
    }

    setIsUploading(true);

    try {
      const fileName = `eden_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: previewImage,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      // 1. Upload to Storage
      const { error: storageError } = await supabase.storage
        .from('plant-photos')
        .upload(fileName, formData);

      if (storageError) throw storageError;

      // 2. Get Public URL
      const { data: urlData } = supabase.storage.from('plant-photos').getPublicUrl(fileName);

      // 3. Insert into public.plant
      const { error: dbError } = await supabase.from('plant').insert([{
        species: speciesName.trim(), // Using state variable here
        picture: urlData.publicUrl,
      }]);

      if (dbError) throw dbError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", `${speciesName} saved to library.`);
      setCameraVisible(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header and Metrics Sections (Same as original) */}
        <View style={styles.headerSection}>
          <ThemedText type="title" style={styles.header}>Biome Monitor</ThemedText>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
              <ThemedText style={styles.statusText}>Live Precision</ThemedText>
            </View>
            <ThemedText style={styles.connectionText}>{connected ? '• Connected' : '• Offline'}</ThemedText>
          </View>
        </View>

        {(['climate', 'soil', 'light'] as MetricCategory[]).map((cat) => (
          <View key={cat} style={styles.categoryBlock}>
            <Pressable onPress={() => toggleCategory(cat)} style={styles.categoryHeader}>
              <ThemedText style={styles.categoryTitle}>{cat.toUpperCase()}</ThemedText>
              <MaterialCommunityIcons 
                name={expandedCats[cat] ? "chevron-down" : "chevron-right"} 
                size={20} color="#9CA3AF" 
              />
            </Pressable>
            {expandedCats[cat] && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.categoryContent}>
                {categorizedData[cat].map((item) => (
                  <MetricCard 
                    key={item.id}
                    label={item.label} value={item.value} unit={item.unit} 
                    colorA={item.colorA} colorB={item.colorB} 
                    icon={item.icon} status={item.status as any}
                  />
                ))}
              </Animated.View>
            )}
          </View>
        ))}

        <View style={styles.glossarySection}>
            <View style={styles.glossaryHeader}>
                <MaterialCommunityIcons name="book-open-variant" size={18} color="#6B7280" />
                <ThemedText style={styles.glossaryTitle}>Scientific Glossary</ThemedText>
            </View>
            {GLOSSARY.map((item) => (
                <View key={item.id} style={styles.glossaryItem}>
                    <ThemedText style={styles.glossaryTerm}>{item.term}</ThemedText>
                    <ThemedText style={styles.glossaryDefinition}>{item.definition}</ThemedText>
                </View>
            ))}
        </View>
      </ScrollView>

      <View style={styles.fabContainer}>
        <Pressable onPress={handleCameraPress} style={styles.fab}>
          <MaterialCommunityIcons name="camera" size={28} color="white" />
        </Pressable>
      </View>

      <Modal visible={cameraVisible} animationType="slide" statusBarTranslucent>
        <ThemedView style={styles.cameraContainer}>
          {!previewImage ? (
            <CameraView style={styles.camera} ref={cameraRef} flash={flashMode} facing="back">
              <View style={styles.cameraTopBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => setCameraVisible(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <View style={styles.cameraBottomBar}>
                <TouchableOpacity style={styles.shutterOuter} onPress={takePicture}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : (
            <View style={styles.previewContainer}>
              <Image source={{ uri: previewImage }} style={styles.previewImage} />
              
              {/* Updated Overlay with Input */}
              <View style={styles.previewOverlay}>
                <ThemedText style={styles.previewTitle}>Identify Specimen</ThemedText>
                
                <TextInput
                  style={styles.speciesInput}
                  placeholder="Enter species name..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={speciesName}
                  onChangeText={setSpeciesName}
                  autoFocus
                />

                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.retakeBtn} onPress={() => setPreviewImage(null)} disabled={isUploading}>
                    <ThemedText style={styles.buttonText}>Retake</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.doneBtn} onPress={uploadAndSavePlant} disabled={isUploading}>
                    {isUploading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <ThemedText style={styles.buttonText}>Upload</ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ThemedView>
        <StatusBar style="light" />
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  // Original Monitor Styles
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  headerSection: { marginBottom: 30 },
  header: { fontSize: 32, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  connectionText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  categoryBlock: { marginBottom: 12, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  categoryContent: { paddingHorizontal: 16, paddingBottom: 16 },
  categoryTitle: { fontSize: 13, fontWeight: '800', color: '#6B7280', letterSpacing: 1 },
  glossarySection: { marginTop: 20, padding: 20, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  glossaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  glossaryTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  glossaryItem: { marginBottom: 12 },
  glossaryTerm: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  glossaryDefinition: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  fabContainer: { position: 'absolute', bottom: 30, right: 25 },
  fab: { backgroundColor: '#8B5CF6', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  
  // Camera & Preview Styles
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraTopBar: { paddingTop: 60, paddingHorizontal: 20 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  cameraBottomBar: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white' },
  previewContainer: { flex: 1 },
  previewImage: { flex: 1, resizeMode: 'cover' },
  previewOverlay: { position: 'absolute', bottom: 0, width: '100%', padding: 40, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center' },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 15 },
  
  // NEW: Input Field Styling
  speciesInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  previewActions: { flexDirection: 'row', gap: 20 },
  retakeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  doneBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 }
});