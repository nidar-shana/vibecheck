import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
});

export default function App() {
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
    loadLastCheck();
  }, []);

  async function loadLastCheck() {
    const v = await AsyncStorage.getItem('lastCheck');
    if (v) setLastCheck(v);
  }

  async function scheduleHourly() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setMinutes(0);
    nextHour.setSeconds(0);
    nextHour.setHours(nextHour.getHours() + 1);

    // schedule repeating every hour starting nextHour
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Vibe Check', body: 'How are you feeling right now?' },
      trigger: { seconds: Math.max(1, Math.floor((nextHour - now) / 1000)), repeats: true }
    });
  }

  async function recordVibe(vibe) {
    const time = new Date().toISOString();
    const item = { time, vibe };
    const raw = (await AsyncStorage.getItem('history')) || '[]';
    const arr = JSON.parse(raw);
    arr.unshift(item);
    await AsyncStorage.setItem('history', JSON.stringify(arr));
    await AsyncStorage.setItem('lastCheck', JSON.stringify(item));
    setLastCheck(JSON.stringify(item));
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>VibeCheck</Text>
      <View style={styles.row}>
        <Button title="Schedule hourly" onPress={scheduleHourly} />
      </View>
      <View style={styles.row}>
        <Button title="Good" onPress={() => recordVibe('good')} />
        <Button title="Okay" onPress={() => recordVibe('okay')} />
        <Button title="Bad" onPress={() => recordVibe('bad')} />
      </View>
      <View style={styles.row}>
        <Text>Last check: {lastCheck ? lastCheck : 'none'}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, marginBottom: 20 },
  row: { marginVertical: 10, flexDirection: 'row', gap: 10 }
});

async function registerForPushNotificationsAsync() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
}
