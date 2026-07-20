import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../lib/api';

export default function CreateAlarmScreen({ navigation }: any) {
  const [time, setTime] = useState(new Date());
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [label, setLabel] = useState('');
  
  // Aligning strictly with ChallengeType Enum
  const [challengeType, setChallengeType] = useState('math'); 
  const challengeOptions = ['math', 'memory', 'pattern', 'logic', 'word_scramble', 'riddle', 'quiz'];

  // Aligning strictly with AlarmType Enum
  const [alarmType, setAlarmType] = useState('daily');
  const alarmTypeOptions = ['one_time', 'daily', 'weekday', 'weekend', 'smart_adaptive'];

  const onChangeTime = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      setTime(selectedDate);
    }
  };

  const handleCreateAlarm = async () => {
    try {
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}:00`;

      // PERFECT PAYLOAD ALIGNMENT WITH PYDANTIC
      const payload = {
        time: timeString,
        label: label || 'Cognitive Alarm',
        alarm_type: alarmType,
        preferred_challenges: challengeType,
        is_active: true,
        snooze_enabled: true,
        snooze_limit: 3
      };

      await api.post('/alarms/', payload);
      Alert.alert("Success", "Alarm successfully scheduled!");
      navigation.goBack(); 
    } catch (error: any) {
      console.error("Failed to create alarm:", error.response?.data || error.message);
      Alert.alert("Error", "Could not save the alarm. Check console.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>New Alarm</Text>

      <View style={styles.timePickerContainer}>
        {Platform.OS === 'android' && (
          <TouchableOpacity style={styles.androidTimeBtn} onPress={() => setShowPicker(true)}>
            <Text style={styles.androidTimeText}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        )}
        
        {(showPicker || Platform.OS === 'ios') && (
          <DateTimePicker
            value={time}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={onChangeTime}
            themeVariant="dark"
          />
        )}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Alarm Label (e.g., Morning Run)"
        placeholderTextColor="#888"
        value={label}
        onChangeText={setLabel}
      />

      <Text style={styles.subHeader}>Recurrence</Text>
      <View style={styles.scrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          {alarmTypeOptions.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, alarmType === type && styles.typeButtonActive]}
              onPress={() => setAlarmType(type)}
            >
              <Text style={[styles.typeText, alarmType === type && styles.typeTextActive]}>
                {type.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.subHeader}>Challenge Type</Text>
      <View style={styles.scrollWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
          {challengeOptions.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, challengeType === type && styles.typeButtonActive]}
              onPress={() => setChallengeType(type)}
            >
              <Text style={[styles.typeText, challengeType === type && styles.typeTextActive]}>
                {type.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleCreateAlarm}>
          <Text style={styles.saveText}>Save Alarm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20 },
  header: { fontSize: 32, fontWeight: 'bold', color: '#FFD700', marginTop: 40, marginBottom: 20 },
  subHeader: { fontSize: 16, fontWeight: 'bold', color: '#FFF', marginTop: 10, marginBottom: 10 },
  timePickerContainer: { alignItems: 'center', marginVertical: 10 },
  androidTimeBtn: { padding: 15, backgroundColor: '#1E1E1E', borderRadius: 8, borderWidth: 1, borderColor: '#333' },
  androidTimeText: { color: '#FFF', fontSize: 32, fontWeight: 'bold' },
  input: { backgroundColor: '#1E1E1E', color: '#FFF', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#333', fontSize: 16, marginBottom: 10 },
  scrollWrapper: { height: 50, marginBottom: 10 },
  scrollContainer: { alignItems: 'center' },
  typeButton: { backgroundColor: '#1E1E1E', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, marginHorizontal: 5, borderWidth: 1, borderColor: '#333' },
  typeButtonActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  typeText: { color: '#888', fontWeight: 'bold', fontSize: 12 },
  typeTextActive: { color: '#000' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', marginBottom: 20 },
  cancelButton: { flex: 1, padding: 15, alignItems: 'center', marginRight: 10, borderRadius: 8, backgroundColor: '#333' },
  cancelText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  saveButton: { flex: 1, padding: 15, alignItems: 'center', marginLeft: 10, borderRadius: 8, backgroundColor: '#FFD700' },
  saveText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});