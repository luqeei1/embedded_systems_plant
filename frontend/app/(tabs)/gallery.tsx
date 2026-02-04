import React, { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, Image, TouchableOpacity, Alert, RefreshControl, Dimensions } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width / 2 - 25;

const supabaseUrl = 'https://xjufkkzlppxvxbkgsqye.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqdWZra3pscHB4dnhia2dzcXllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNDQ5NTIsImV4cCI6MjA4NTYyMDk1Mn0.tclAzVQhrjKJl3B9yqDzqjNjak55OQBTg9JfF-eH32k';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GalleryScreen() {
  const [plants, setPlants] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPlants = async () => {
    const { data, error } = await supabase
      .from('plant')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setPlants(data || []);
    setRefreshing(false);
  };

  useEffect(() => { fetchPlants(); }, []);

  const handleDelete = async (id: number, pictureUrl: string) => {
    Alert.alert("Delete Specimen", "This will permanently remove the data and the image. Continue?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Delete", 
        style: "destructive", 
        onPress: async () => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // 1. Extract filename from URL (The part after the last slash)
            const fileName = pictureUrl.split('/').pop();

            if (fileName) {
              // 2. Delete from Supabase Storage
              const { error: storageError } = await supabase.storage
                .from('plant-photos')
                .remove([fileName]);
              
              if (storageError) console.error("Storage delete error:", storageError.message);
            }

            // 3. Delete from Database
            const { error: dbError } = await supabase
              .from('plant')
              .delete()
              .eq('id', id);

            if (dbError) throw dbError;

            // 4. Update UI
            fetchPlants();
            
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        }
      }
    ]);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Specimen Library</ThemedText>
      </View>

      <FlatList
        data={plants}
        numColumns={2}
        keyExtractor={(item) => item.id.toString()}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={() => {setRefreshing(true); fetchPlants();}} 
            tintColor="#8B5CF6"
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.picture }} style={styles.image} />
            <View style={styles.info}>
              <ThemedText style={styles.species}>{item.species}</ThemedText>
              <ThemedText style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</ThemedText>
            </View>
            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={() => handleDelete(item.id, item.picture)}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 10 },
  title: { fontSize: 28, fontWeight: '800' },
  list: { paddingHorizontal: 15, paddingBottom: 40 },
  row: { justifyContent: 'space-between' },
  card: { backgroundColor: '#fff', width: COLUMN_WIDTH, borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F3F4F6' },
  image: { width: '100%', height: COLUMN_WIDTH },
  info: { padding: 10 },
  species: { fontSize: 14, fontWeight: '700' },
  date: { fontSize: 11, color: '#9CA3AF' },
  deleteBtn: { position: 'absolute', top: 5, right: 5, backgroundColor: 'white', padding: 5, borderRadius: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 }
});