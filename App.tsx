import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LoginScreen from './LoginScreen';
import MatchList from './MatchList';
import { logout } from './authConfig';

interface User {
  email: string;
  isSignup: boolean;
  google?: boolean;
  name?: string | null;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Tu veux vraiment te déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Déconnexion", style: "destructive",
        onPress: async () => {
          await logout();
          setUser(null);
        },
      },
    ]);
  };

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={(u) => setUser(u)} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#111', '#1a1a1a']} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GoalPulse</Text>
          <Text style={styles.welcome}>
            Salut {user.name || user.email.split('@')[0]} 👋
          </Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={26} color="#39FF14" />
        </TouchableOpacity>
      </View>

      <MatchList userEmail={user.email} />
      <StatusBar style="light" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 15,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#39FF14', letterSpacing: 1 },
  welcome: { color: '#888', fontSize: 14, marginTop: 2 },
  logoutBtn: {
    width: 45, height: 45, borderRadius: 12,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
});
