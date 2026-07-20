import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../lib/api';
import * as SecureStore from 'expo-secure-store';

export default function DashboardScreen({ navigation }: any) {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlarms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alarms/');
      setAlarms(response.data);
    } catch (error) {
      console.error("Failed to fetch alarms:", error);
      Alert.alert("Error", "Could not load your alarms.");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch alarms every time this screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAlarms();
    });
    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    // Reset navigation stack so user can't swipe back to dashboard
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const renderAlarm = ({ item }: { item: any }) => {
    // Basic formatting for the time string coming from backend
    const timeString = new Date(item.alarm_time).toLocaleTimeString([], { 
      hour: '2-digit', minute: '2-digit' 
    });

    return (
      <View style={styles.alarmCard}>
        <View style={styles.alarmInfo}>
          <Text style={styles.alarmTime}>{timeString}</Text>
          <Text style={styles.alarmLabel}>{item.label || 'Cognitive Alarm'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#4CAF50' : '#555' }]}>
          <Text style={styles.statusText}>{item.is_active ? 'ON' : 'OFF'}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>My Alarms</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginTop: 50 }} />
      ) : alarms.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No alarms set.</Text>
          <Text style={styles.emptyStateSubText}>Tap below to create one!</Text>
        </View>
      ) : (
        <FlatList
          data={alarms}
          keyExtractor={(item: any) => item.id.toString()}
          renderItem={renderAlarm}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Floating Action Button (FAB) for creating new alarms */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('CreateAlarm')}
      >
        <Text style={styles.fabText}>+ New Alarm</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingHorizontal: 20 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 60, marginBottom: 20 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#FFD700' },
  logoutText: { color: '#FF5252', fontSize: 16, fontWeight: 'bold' },
  
  alarmCard: { 
    backgroundColor: '#1E1E1E', padding: 20, borderRadius: 12, marginBottom: 15, 
    borderWidth: 1, borderColor: '#333', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' 
  },
  alarmInfo: { flex: 1 },
  alarmTime: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  alarmLabel: { fontSize: 14, color: '#AAA', marginTop: 4 },
  
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  emptyStateSubText: { color: '#888', fontSize: 16, marginTop: 10 },
  
  fab: { 
    position: 'absolute', bottom: 30, right: 20, left: 20, 
    backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 5 
  },
  fabText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});