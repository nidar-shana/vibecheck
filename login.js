import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleLogin() {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setMessage('Please enter both username and password.');
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
      setMessage('New login saved. You are logged in.');
    } else {
      setMessage('Welcome back. You are logged in.');
    }

    onLoginSuccess();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to VibeCheck</Text>
      <Text style={styles.subtitle}>Sign in to continue</Text>

      <View style={styles.card}>
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
        <Button title="Login" onPress={handleLogin} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f7f7f7'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12
  },
  message: {
    marginTop: 12,
    color: '#007AFF',
    textAlign: 'center'
  }
});
