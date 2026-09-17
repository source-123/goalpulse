import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LoginScreen from './LoginScreen';
import GoalList from './GoalList';

interface User {
  email: string;
  isSignup: boolean;
  google?: boolean;
  name?: string | null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={(u) => setUser(u)} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚀 GoalPulse</Text>
        <TouchableOpacity onPress={() => setUser(null)}>
          <Ionicons name="log-out-outline" size={28} color="#39FF14" />
        </TouchableOpacity>
      </View>
      <Text style={styles.welcome}>
        Salut {user.name || user.email.split('@')[0]} 👋
      </Text>
      <GoalList />
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a', paddingTop: 60 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 5,
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#39FF14' },
  welcome: { color: '#aaa', paddingHorizontal: 20, marginBottom: 15, fontSize: 14 },
});
