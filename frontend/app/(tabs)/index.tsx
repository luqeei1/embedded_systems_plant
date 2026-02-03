import { StyleSheet, View, FlatList, Pressable, Modal, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
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

// --- SUPABASE CONFIG ---
const supabaseUrl = 'https://xjufkkzlppxvxbkgsqye.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdWZra3pscHB4dnhia2dzcXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDQ5NTIsImV4cCI6MjA4NTYyMDk1Mn0.tclAzVQhrjKJl3B9yqDzqjNjak55OQBTg9JfF-eH32k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export default function HomeScreen() {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [flashMode, setFlashMode] = useState<FlashMode>('off');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

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
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 }); 
        if (photo) setPreviewImage(photo.uri);
      } catch (e) {
        console.error("Capture Error:", e);
      }
    }
  };

  const uploadAndSavePlant = async () => {
    if (!previewImage) return;
    
    setIsUploading(true);
    try {
      const fileName = `plant_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: previewImage,
        name: fileName,
        type: 'image/jpeg',
      } as any);

      const { error: storageError } = await supabase.storage
        .from('plant-photos')
        .upload(fileName, formData);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from('plant-photos').getPublicUrl(fileName);
      const publicImageUrl = urlData.publicUrl;

      const { error: dbError } = await supabase
        .from('plant')
        .insert([{
          species: 'House Plant', 
          picture: publicImageUrl,
          max_temp: 28,
          min_temp: 18,
          light: 7200,
          humidity: 48,
          soil_humidity: 62,
        }]);

      if (dbError) throw dbError;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Plant data and photo synced successfully!");
      setCameraVisible(false);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Upload Failed", error.message || "Could not save to Supabase");
    } finally {
      setIsUploading(false);
    }
  };

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
        keyExtractor={(item) => item.id}
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
          </Animated.View>
        )}
        contentContainerStyle={styles.list}
        ListFooterComponent={
            <View style={styles.recommendationSection}>
                <ThemedText style={styles.recommendationTitle}>Care Tips</ThemedText>
                {recommendations.map((rec) => (
                    <View key={rec.id} style={styles.recommendationItem}>
                        <MaterialCommunityIcons name={rec.icon as any} size={18} color="#8B5CF6" />
                        <ThemedText style={styles.recommendationText}>{rec.text}</ThemedText>
                    </View>
                ))}
            </View>
        }
      />

      <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.fabContainer}>
        <Pressable onPress={handleCameraPress} style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}>
          <MaterialCommunityIcons name="camera" size={28} color="white" />
        </Pressable>
      </Animated.View>

      <Modal visible={cameraVisible} animationType="slide" statusBarTranslucent>
        <View style={styles.cameraContainer}>
          {!previewImage ? (
            <CameraView style={styles.camera} ref={cameraRef} flash={flashMode} facing="back">
              <View style={styles.cameraTopBar}>
                <TouchableOpacity style={styles.iconCircle} onPress={() => setCameraVisible(false)}>
                    <MaterialCommunityIcons name="close" size={24} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconCircle} onPress={() => setFlashMode(prev => prev === 'off' ? 'on' : 'off')}>
                  <MaterialCommunityIcons name={flashMode === 'on' ? "flash" : "flash-off"} size={22} color="white" />
                </TouchableOpacity>
              </View>
              <View style={styles.gridOverlay} pointerEvents="none">
                <View style={styles.frameGuide} />
              </View>
              <View style={styles.cameraBottomBar}>
                <TouchableOpacity style={styles.shutterOuter} onPress={takePicture}>
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : (
            <Animated.View entering={FadeIn} style={styles.previewContainer}>
              <Image source={{ uri: previewImage }} style={styles.previewImage} />
              <View style={styles.previewOverlay}>
                <ThemedText style={styles.previewTitle}>Review Photo</ThemedText>
                <View style={styles.previewActions}>
                  <TouchableOpacity style={styles.retakeBtn} onPress={() => setPreviewImage(null)} disabled={isUploading}>
                    <ThemedText style={styles.buttonText}>Retake</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.doneBtn} onPress={uploadAndSavePlant} disabled={isUploading}>
                    {isUploading ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <View style={styles.row}>
                        <MaterialCommunityIcons name="cloud-upload" size={20} color="white" />
                        <ThemedText style={styles.buttonText}>Save to Cloud</ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          )}
        </View>
        <StatusBar style="light" />
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 60 },
  headerSection: { marginBottom: 32, gap: 10 },
  header: { fontSize: 36, fontWeight: '800' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  list: { paddingBottom: 100 },
  cardWrapper: { marginBottom: 12 },
  recommendationSection: { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: 16, padding: 16, marginTop: 20 },
  recommendationTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#8B5CF6' },
  recommendationItem: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  recommendationText: { fontSize: 13 },
  fabContainer: { position: 'absolute', bottom: 30, right: 20, zIndex: 10 },
  fab: { backgroundColor: '#8B5CF6', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  fabPressed: { transform: [{ scale: 0.9 }] },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  cameraTopBar: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  gridOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frameGuide: { width: '80%', height: '60%', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, borderStyle: 'dashed' },
  cameraBottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  shutterOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'white' },
  previewContainer: { flex: 1, backgroundColor: 'black' },
  previewImage: { flex: 1, resizeMode: 'cover' },
  previewOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 40, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center' },
  previewTitle: { color: 'white', fontSize: 20, fontWeight: '700', marginBottom: 20 },
  previewActions: { flexDirection: 'row', gap: 20 },
  retakeBtn: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  doneBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 30 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }
});