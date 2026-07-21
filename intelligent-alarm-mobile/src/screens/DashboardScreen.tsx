import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../lib/api';
import * as SecureStore from 'expo-secure-store';

export default function DashboardScreen({ navigation }: any) {
  const [alarms, setAlarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlarms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/alarms/');
      setAlarms(response.data);
    } catch (error) {
      console.error("Failed to fetch alarms:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAlarms();
    });
    return unsubscribe;
  }, [navigation]);

  // 🕒 THE ALARM TRIGGER LOOP
  // Checks the time every 10 seconds to see if an active alarm matches the current time
  useEffect(() => {
    const interval = setInterval(() => {
      if (alarms.length === 0) return;
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      alarms.forEach((alarm) => {
        if (!alarm.is_active || !alarm.time) return;
        
        // Parse "HH:MM:SS" from the backend
        const [alarmHour, alarmMinute] = alarm.time.split(':').map(Number);
        
        // If the times match, trigger the ringing screen!
        if (currentHour === alarmHour && currentMinute === alarmMinute) {
          // Disable it locally so it doesn't trigger 6 times in the same minute
          alarm.is_active = false; 
          navigation.navigate('Ringing', { alarmId: alarm.id, label: alarm.label });
        }
      });
    }, 10000); // 10000 ms = 10 seconds

    return () => clearInterval(interval);
  }, [alarms, navigation]);

  const handleDelete = async (alarmId: string) => {
    try {
      await api.delete(`/alarms/${alarmId}`);
      // Remove it from the local state immediately
      setAlarms((prev) => prev.filter((a) => a.id !== alarmId));
    } catch (error) {
      console.error("Failed to delete:", error);
      Alert.alert("Error", "Could not delete this alarm.");
    }
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('access_token');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const renderAlarm = ({ item }: { item: any }) => {
    const timeStringRaw = item.time || "00:00:00"; 
    const [hourStr, minStr] = timeStringRaw.split(':');
    let hour = parseInt(hourStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    hour = hour % 12 || 12; 
    const formattedTime = `${hour}:${minStr} ${ampm}`;

    return (
      <View style={styles.alarmCard}>
        <View style={styles.alarmInfo}>
          <Text style={styles.alarmTime}>{formattedTime}</Text>
          <Text style={styles.alarmLabel}>{item.label || 'Cognitive Alarm'}</Text>
          <Text style={styles.challengeTypeLabel}>Type: {item.preferred_challenges}</Text>
        </View>

        <View style={styles.actionColumn}>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#4CAF50' : '#555' }]}>
            <Text style={styles.statusText}>{item.is_active ? 'ON' : 'OFF'}</Text>
          </View>
          
          <View style={styles.buttonRow}>
            {/* 🔔 TEST RING BUTTON */}
            <TouchableOpacity 
              style={styles.testButton} 
              onPress={() => navigation.navigate('Ringing', { alarmId: item.id, label: item.label })}
            >
              <Text style={styles.testButtonText}>Test</Text>
            </TouchableOpacity>

            {/* 🗑️ DELETE BUTTON */}
            <TouchableOpacity 
              style={styles.deleteButton} 
              onPress={() => handleDelete(item.id)}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
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

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateAlarm')}>
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
  
  alarmCard: { backgroundColor: '#1E1E1E', padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#333', flexDirection: 'row', justifyContent: 'space-between' },
  alarmInfo: { flex: 1 },
  alarmTime: { fontSize: 26, fontWeight: 'bold', color: '#FFF' },
  alarmLabel: { fontSize: 14, color: '#AAA', marginTop: 4 },
  challengeTypeLabel: { fontSize: 12, color: '#666', marginTop: 2, textTransform: 'capitalize' },
  
  actionColumn: { alignItems: 'flex-end', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginBottom: 10 },
  statusText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  
  buttonRow: { flexDirection: 'row', gap: 10 },
  testButton: { backgroundColor: '#333', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  testButtonText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
  deleteButton: { backgroundColor: '#441111', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  deleteButtonText: { color: '#FF5252', fontSize: 12, fontWeight: 'bold' },
  
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyStateText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  emptyStateSubText: { color: '#888', fontSize: 16, marginTop: 10 },
  
  fab: { position: 'absolute', bottom: 30, right: 20, left: 20, backgroundColor: '#FFD700', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 5 },
  fabText: { color: '#000', fontSize: 18, fontWeight: 'bold' }
});