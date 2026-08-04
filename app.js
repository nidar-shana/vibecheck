import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, Button, StyleSheet, TextInput } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: false })
});

export default function App() {
  const [lastCheck, setLastCheck] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginMessage, setLoginMessage] = useState('');

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

  async function saveLogin() {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setLoginMessage('Please enter both username and password.');
      return;
    }

    const raw = (await AsyncStorage.getItem('users')) || '[]';
    const users = JSON.parse(raw);
    const exists = users.some(
      (user) => user.username === trimmedUsername && user.password === trimmedPassword
    );

    if (!exists) {
      users.push({ username: trimmedUsername, password: trimmedPassword });
      await AsyncStorage.setItem('users', JSON.stringify(users));
      setLoginMessage('Login saved to the database.');
    } else {
      setLoginMessage('Login already exists in the database.');
    }
  }

  async function verifyLogin() {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setLoginMessage('Please enter both username and password.');
      return;
    }

    const raw = (await AsyncStorage.getItem('users')) || '[]';
    const users = JSON.parse(raw);
    const exists = users.some(
      (user) => user.username === trimmedUsername && user.password === trimmedPassword
    );

    setLoginMessage(
      exists ? 'Login exists in the database.' : 'Login not found in the database.'
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>VibeCheck</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Login</Text>
        <TextInput
          style={styles.input}
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <View style={styles.row}>
          <Button title="Save Login" onPress={saveLogin} />
          <Button title="Verify Login" onPress={verifyLogin} />
        </View>
        {loginMessage ? <Text style={styles.message}>{loginMessage}</Text> : null}
      </View>

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
  card: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10
  },
  row: { marginVertical: 10, flexDirection: 'row', gap: 10 },
  message: { marginTop: 8, color: '#007AFF' }
});

async function registerForPushNotificationsAsync() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return;
}
