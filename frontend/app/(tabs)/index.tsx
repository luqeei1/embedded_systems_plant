import { StyleSheet, View, Pressable, Modal, TouchableOpacity, Image, ActivityIndicator, Alert, ScrollView, TextInput, FlatList } from 'react-native';
import { useState, useRef, useEffect, useMemo } from 'react';
import Animated, { FadeInDown, FadeInUp, FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
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

const PLANTNET_API_KEY = "2b10KiKsMUeENafn6MPQolwHO";
const PLANTNET_API_URL = `https://my-api.plantnet.org/v2/identify/all?api-key=${PLANTNET_API_KEY}`;

// --- PLACEHOLDER KNOWLEDGE BASE ---
const SPECIES_KNOWLEDGE_BASE: Record<string, any> = {
  "Neanthe Bella Palm": {
    temp: { min: 18, max: 25 },
    hum: { min: 50, max: 70 },
    vpd: { min: 0.8, max: 1.1 },
    soil: { min: 45, max: 65 },
    ppfd: { min: 100, max: 300 }
  },
  "Default": {
    temp: { min: 18, max: 28 },
    hum: { min: 40, max: 75 },
    vpd: { min: 0.4, max: 1.6 },
    soil: { min: 35, max: 80 },
    ppfd: { min: 100, max: 1200 }
  }
};

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
  idealRange: string;
};

const GLOSSARY = [
  { id: '1', term: 'PPFD', definition: 'Photosynthetic Photon Flux Density. Measures actual light particles reaching the plant.' },
  { id: '2', term: 'VPD', definition: 'Vapor Pressure Deficit. Measures the atmospheric "thirst" that pulls water through the plant.' },
  { id: '3', term: 'Quality Index', definition: "Efficiency of the light spectrum at driving photosynthesis (0.0 - 1.0)." },
  { id: '4', term: 'R:B Ratio', definition: 'Red-to-Blue ratio. Higher Red helps flowering; higher Blue helps vegetative bushiness.' }
];

export default function HomeScreen() {
  const [expandedCats, setExpandedCats] = useState<Record<MetricCategory, boolean>>({
    climate: true, soil: true, light: true
  });
  const [cameraVisible, setCameraVisible] = useState(false);
  const [speciesModalVisible, setSpeciesModalVisible] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [availableSpecies, setAvailableSpecies] = useState<string[]>([]);
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { data: sensorData, connected } = useSensorData();

  // --- REUSABLE FETCH FUNCTION ---
  const fetchSpeciesList = async () => {
    const { data, error } = await supabase.from('plant').select('species');
    if (!error && data) {
      const uniqueNames = Array.from(new Set(data.map(p => p.species))).filter(Boolean) as string[];
      setAvailableSpecies(uniqueNames);
    }
  };

  useEffect(() => {
    fetchSpeciesList();
  }, []);

  const dynamicMetricsConfig: Metric[] = useMemo(() => {
    const lookup = (selectedSpecies && SPECIES_KNOWLEDGE_BASE[selectedSpecies]) 
      ? SPECIES_KNOWLEDGE_BASE[selectedSpecies] 
      : SPECIES_KNOWLEDGE_BASE["Default"];

    return [
      { id: 'temperature', category: 'climate', label: 'Air Temp', value: 0, unit: '°C', colorA: '#FF8A65', colorB: '#D84315', icon: 'thermometer', min: lookup.temp.min, max: lookup.temp.max, idealRange: `${lookup.temp.min}.0 - ${lookup.temp.max}.0` },
      { id: 'humidity', category: 'climate', label: 'Air Humidity', value: 0, unit: '%', colorA: '#80DEEA', colorB: '#00ACC1', icon: 'cloud-percent', min: lookup.hum.min, max: lookup.hum.max, idealRange: `${lookup.hum.min}.0 - ${lookup.hum.max}.0` },
      { id: 'vpd', category: 'climate', label: 'VPD', value: 0, unit: 'kPa', colorA: '#A78BFA', colorB: '#7C3AED', icon: 'gauge', min: lookup.vpd.min, max: lookup.vpd.max, idealRange: `${lookup.vpd.min} - ${lookup.vpd.max}` },
      { id: 'moisture', category: 'soil', label: 'Soil Moisture', value: 0, unit: '%', colorA: '#3DDC84', colorB: '#1B8F6B', icon: 'water', min: lookup.soil.min, max: lookup.soil.max, idealRange: `${lookup.soil.min}.0 - ${lookup.soil.max}.0` },
      { id: 'ppfd', category: 'light', label: 'PPFD', value: 0, unit: 'μmol', colorA: '#FFF176', colorB: '#F9A825', icon: 'sun', min: lookup.ppfd.min, max: lookup.ppfd.max, idealRange: `${lookup.ppfd.min} - ${lookup.ppfd.max}` },
      { id: 'quality_index', category: 'light', label: 'Quality Index', value: 0, unit: 'eff', colorA: '#F472B6', colorB: '#DB2777', icon: 'leaf-circle', min: 0.7, max: 1.0, idealRange: '0.70 - 1.00' },
      { id: 'red_blue_ratio', category: 'light', label: 'R:B Ratio', value: 0, unit: ':1', colorA: '#60A5FA', colorB: '#2563EB', icon: 'chart-scatter-plot', min: 0.5, max: 2.5, idealRange: '0.50 - 2.50' },
    ];
  }, [selectedSpecies]);

  const toggleCategory = (cat: MetricCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const getCategorizedMetrics = () => {
    const categories: Record<MetricCategory, (Metric & { status: string })[]> = {
      climate: [], soil: [], light: []
    };
    dynamicMetricsConfig.forEach(m => {
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
    setCameraVisible(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); 
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 }); 
        if (photo) setPreviewImage(photo.uri);
      } catch (e) { console.error("Capture Error:", e); }
    }
  };

  const identifyPlantAI = async (imageUri: string) => {
    const formData = new FormData();
    formData.append('images', {
      uri: imageUri,
      name: 'id_request.jpg',
      type: 'image/jpeg',
    } as any);

    try {
      const response = await fetch(PLANTNET_API_URL, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const bestMatch = data.results[0].species;
        const scientificName = bestMatch.scientificNameWithoutAuthor;
        const commonName = (bestMatch.commonNames && bestMatch.commonNames.length > 0) 
                           ? bestMatch.commonNames[0] 
                           : null;
        return commonName ? `${scientificName} (${commonName})` : scientificName;
      }
      return "Unknown Species";
    } catch (e) {
      return "Identification Error";
    }
  };

  const uploadAndSavePlant = async () => {
    if (!previewImage) return;
    setIsUploading(true);

    try {
      const aiFullName = await identifyPlantAI(previewImage);
      const fileName = `eden_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', { uri: previewImage, name: fileName, type: 'image/jpeg' } as any);

      const { error: storageError } = await supabase.storage.from('plant-photos').upload(fileName, formData);
      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from('plant-photos').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('plant').insert([{
        species: aiFullName, 
        picture: urlData.publicUrl,
      }]);

      if (dbError) throw dbError;

      // --- RE-FETCH THE LIST HERE ---
      await fetchSpeciesList();

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Identification Successful", `Result: ${aiFullName}\nSync Complete.`);
      setCameraVisible(false);
    } catch (error: any) {
      Alert.alert("Upload Error", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <ThemedText type="title" style={styles.header}>Biome Monitor</ThemedText>
          <View style={styles.statusRow}>
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#10B981" />
              <ThemedText style={styles.statusText}>Live Precision</ThemedText>
            </View>
            <ThemedText style={styles.connectionText}>{connected ? '• Connected' : '• Offline'}</ThemedText>
          </View>

          <Pressable style={styles.dropdownTrigger} onPress={() => {Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSpeciesModalVisible(true);}}>
             <View style={styles.dropdownInfo}>
                <ThemedText style={styles.dropdownLabel}>TARGET SPECIMEN</ThemedText>
                <ThemedText style={styles.dropdownValue} numberOfLines={1}>
                  {selectedSpecies || "Select Plant Species..."}
                </ThemedText>
             </View>
             <MaterialCommunityIcons name="chevron-down" size={22} color="#8B5CF6" />
          </Pressable>
        </View>

        {(['climate', 'soil', 'light'] as MetricCategory[]).map((cat) => (
          <View key={cat} style={styles.categoryBlock}>
            <Pressable onPress={() => toggleCategory(cat)} style={styles.categoryHeader}>
              <ThemedText style={styles.categoryTitle}>{cat.toUpperCase()}</ThemedText>
              <MaterialCommunityIcons name={expandedCats[cat] ? "chevron-down" : "chevron-right"} size={20} color="#9CA3AF" />
            </Pressable>
            {expandedCats[cat] && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.categoryContent}>
                {categorizedData[cat].map((item) => (
                  <View key={item.id} style={styles.metricWrapper}>
                    <MetricCard label={item.label} value={item.value} unit={item.unit} colorA={item.colorA} colorB={item.colorB} icon={item.icon} status={item.status as any} />
                    <View style={styles.targetTag}>
                      <View style={[styles.targetIndicator, { backgroundColor: item.colorA }]} />
                      <ThemedText style={styles.targetLabel}>IDEAL RANGE</ThemedText>
                      <View style={styles.targetValueContainer}>
                        <ThemedText style={styles.targetValue}>{item.idealRange}</ThemedText>
                        <ThemedText style={styles.targetUnit}>{item.unit}</ThemedText>
                      </View>
                    </View>
                  </View>
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

      {/* SPECIES MODAL */}
      <Modal visible={speciesModalVisible} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.modalContent}>
            <View style={styles.modalHeader}><View style={styles.modalHandle} /><ThemedText style={styles.modalTitle}>Choose Specimen</ThemedText></View>
            <FlatList 
              data={availableSpecies} 
              keyExtractor={(item) => item} 
              contentContainerStyle={styles.listContainer} 
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.speciesOption} 
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setSelectedSpecies(item);
                    setSpeciesModalVisible(false);
                  }}
                >
                  <MaterialCommunityIcons name="leaf" size={20} color="#8B5CF6" style={styles.optionIcon} />
                  <ThemedText style={styles.optionText} numberOfLines={1}>{item}</ThemedText>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSpeciesModalVisible(false)}><ThemedText style={styles.closeBtnText}>Cancel</ThemedText></TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <View style={styles.fabContainer}>
        <Pressable onPress={handleCameraPress} style={styles.fab}><MaterialCommunityIcons name="camera" size={28} color="white" /></Pressable>
      </View>

      <Modal visible={cameraVisible} animationType="slide" statusBarTranslucent>
        <ThemedView style={styles.cameraContainer}>
          {!previewImage ? (
            <CameraView style={styles.camera} ref={cameraRef} facing="back">
              <TouchableOpacity style={styles.closeCam} onPress={() => setCameraVisible(false)}><MaterialCommunityIcons name="close" size={24} color="white" /></TouchableOpacity>
              <View style={styles.cameraBottomBar}><TouchableOpacity style={styles.shutterOuter} onPress={takePicture}><View style={styles.shutterInner} /></TouchableOpacity></View>
            </CameraView>
          ) : (
            <View style={styles.previewContainer}>
              <Image source={{ uri: previewImage }} style={styles.previewImage} />
              <View style={styles.previewOverlay}>
                <ThemedText style={styles.previewTitle}>Specimen Captured</ThemedText>
                <ThemedText style={styles.previewSub}>AI will identify this plant on upload.</ThemedText>
                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.retakeBtn} onPress={() => setPreviewImage(null)} disabled={isUploading}><ThemedText style={styles.buttonText}>Retake</ThemedText></TouchableOpacity>
                  <TouchableOpacity style={styles.doneBtn} onPress={uploadAndSavePlant} disabled={isUploading}>
                    {isUploading ? <ActivityIndicator color="white" size="small" /> : <ThemedText style={styles.buttonText}>AI Upload</ThemedText>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },
  headerSection: { marginBottom: 30 },
  header: { fontSize: 32, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  connectionText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  dropdownTrigger: { marginTop: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', paddingHorizontal: 18, paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', elevation: 3 },
  dropdownInfo: { gap: 2, flex: 1 },
  dropdownLabel: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1 },
  dropdownValue: { fontSize: 15, fontWeight: '700', color: '#374151' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  listContainer: { paddingHorizontal: 20, paddingVertical: 10 },
  speciesOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
  optionIcon: { marginRight: 14 },
  optionText: { flex: 1, fontSize: 16, fontWeight: '600', color: '#374151' },
  modalCloseBtn: { marginHorizontal: 24, marginTop: 10, paddingVertical: 16, borderRadius: 16, backgroundColor: '#F3F4F6', alignItems: 'center' },
  closeBtnText: { fontWeight: '700', color: '#6B7280' },
  categoryBlock: { marginBottom: 12, backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  categoryContent: { paddingHorizontal: 16, paddingBottom: 16 },
  categoryTitle: { fontSize: 13, fontWeight: '800', color: '#6B7280', letterSpacing: 1 },
  metricWrapper: { marginBottom: 24 },
  targetTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', marginTop: -8, marginHorizontal: 10, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#E5E7EB', zIndex: -1 },
  targetIndicator: { width: 5, height: 16, borderRadius: 2, marginRight: 12, opacity: 0.7 },
  targetLabel: { fontSize: 12, fontWeight: '900', color: '#9CA3AF', letterSpacing: 0.8, flex: 1 },
  targetValueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  targetValue: { fontSize: 15, fontWeight: '800', color: '#4B5563' },
  targetUnit: { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  glossarySection: { marginTop: 20, padding: 20, backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  glossaryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  glossaryTitle: { fontSize: 16, fontWeight: '700', color: '#374151' },
  glossaryItem: { marginBottom: 12 },
  glossaryTerm: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  glossaryDefinition: { fontSize: 12, color: '#6B7280', lineHeight: 17 },
  fabContainer: { position: 'absolute', bottom: 30, right: 25 },
  fab: { backgroundColor: '#8B5CF6', width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  closeCam: { position: 'absolute', top: 60, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  cameraBottomBar: { position: 'absolute', bottom: 40, width: '100%', alignItems: 'center' },
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white' },
  previewContainer: { flex: 1 },
  previewImage: { flex: 1, resizeMode: 'cover' },
  previewOverlay: { position: 'absolute', bottom: 0, width: '100%', padding: 40, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center' },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: '700' },
  previewSub: { color: '#9CA3AF', fontSize: 14, marginTop: 5, marginBottom: 25 },
  previewActions: { flexDirection: 'row', gap: 20 },
  retakeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  doneBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 }
});