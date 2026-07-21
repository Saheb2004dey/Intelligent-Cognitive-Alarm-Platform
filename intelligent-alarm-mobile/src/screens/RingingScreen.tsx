import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import api from '../lib/api';

export default function RingingScreen({ route, navigation }: any) {
  const { alarmId, label } = route.params;
  
  const [challenge, setChallenge] = useState<any>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [streakState, setStreakState] = useState({ current: 0, target: 1 });
  
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    playAlarmSound();
    fetchChallenge();

    return () => {
      stopAlarmSound();
    };
  }, []);

  const playAlarmSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/alarm-sound.mp3'),
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      soundRef.current = sound;
    } catch (error) {
      console.error("Error loading alarm sound", error);
    }
  };

  const stopAlarmSound = async () => {
    if (soundRef.current) {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
  };

  const fetchChallenge = async () => {
    try {
      setLoading(true);
      setAnswer(''); // Clear input for the next challenge
      
      // FIX: Passing alarm_id as a query parameter as expected by FastAPI
      const response = await api.get('/challenges/next', {
        params: { 
          alarm_id: alarmId,
          challenge_type: 'random' 
        }
      });
      
      setChallenge(response.data);
      if (response.data.streak_state) {
        setStreakState(response.data.streak_state);
      }
    } catch (error) {
      console.error("Failed to fetch challenge:", error);
      Alert.alert("Error", "Could not load challenge. Answer '1' to bypass.");
      setChallenge({ problem: "Emergency Bypass: Type 1", difficulty: 1 });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      const response = await api.post('/challenges/verify', {
        alarm_id: alarmId,
        answer: answer.trim() // Backend uses normalize_text, but trimming UI spaces helps
      });

      const { success, dismiss_alarm, current_streak, target_streak } = response.data;
      
      setStreakState({ current: current_streak, target: target_streak });

      if (success) {
        if (dismiss_alarm) {
          await stopAlarmSound();
          Alert.alert("Good Morning!", "Challenges complete. Alarm deactivated.");
          navigation.goBack(); 
        } else {
          // Success, but streak not met. Fetch the next challenge!
          fetchChallenge();
        }
      } else {
        Alert.alert("Incorrect", "Try again. The alarm won't stop!");
        setAnswer('');
      }
    } catch (error) {
      console.error("Verification failed:", error);
      Alert.alert("Network Error", "Keep trying!");
    }
  };

  const handleSnooze = async () => {
    try {
      await api.post('/alarms/snooze', { alarm_id: alarmId });
      await stopAlarmSound();
      Alert.alert("Snoozed", "I'll be back in 5 minutes...");
      navigation.goBack();
    } catch (error: any) {
      if (error.response?.status === 400) {
        Alert.alert("Snooze Limit Reached!", "You must solve the challenge now.");
      } else {
        console.error("Snooze failed:", error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.alarmLabel}>{label || "WAKE UP!"}</Text>
      
      {/* Dynamic Streak Indicator */}
      <Text style={styles.streakText}>
        Challenge {streakState.current + 1} of {streakState.target}
      </Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#FFD700" style={{ marginVertical: 30 }} />
      ) : (
        <View style={styles.challengeBox}>
          {/* 
            Bulletproof rendering:
            1. Try 'problem' (schema standard)
            2. Try 'question' (common ML generator output)
            3. If neither exist, print the raw JSON so we can debug the payload!
          */}
          <Text style={styles.challengePrompt}>
            {challenge?.problem || challenge?.question || (challenge ? JSON.stringify(challenge) : "No challenge data received")}
          </Text>
        </View>
      )}

      <TextInput
        style={styles.input}
        placeholder="Enter your answer..."
        placeholderTextColor="#888"
        value={answer}
        onChangeText={setAnswer}
        keyboardType="default"
        autoCapitalize="none"
      />

      <TouchableOpacity style={styles.verifyButton} onPress={handleVerify}>
        <Text style={styles.verifyText}>VERIFY ANSWER</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.snoozeButton} onPress={handleSnooze}>
        <Text style={styles.snoozeText}>Snooze (5 min)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#8B0000', padding: 20, justifyContent: 'center', alignItems: 'center' },
  alarmLabel: { fontSize: 40, fontWeight: 'bold', color: '#FFF', marginBottom: 10, textAlign: 'center' },
  streakText: { fontSize: 18, color: '#FFD700', marginBottom: 30, fontWeight: 'bold' },
  
  challengeBox: { backgroundColor: '#1E1E1E', padding: 30, borderRadius: 15, marginBottom: 30, width: '100%', alignItems: 'center', borderWidth: 2, borderColor: '#FFD700' },
  challengePrompt: { fontSize: 24, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
  
  input: { backgroundColor: '#FFF', color: '#000', padding: 20, borderRadius: 10, fontSize: 20, width: '100%', marginBottom: 30, textAlign: 'center', fontWeight: 'bold' },
  
  verifyButton: { backgroundColor: '#FFD700', padding: 20, borderRadius: 10, width: '100%', alignItems: 'center', marginBottom: 20 },
  verifyText: { color: '#000', fontSize: 20, fontWeight: 'bold' },
  
  snoozeButton: { backgroundColor: '#555', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  snoozeText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' }
});