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
    Alert.alert('Déconnexion', 'Tu veux vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion', style: 'destructive',
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
    <LinearGradient
      colors={['#0a0a0a', '#111', '#1a1a1a']}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Ionicons name="football" size={22} color="#39FF14" />
          </View>
          <View>
            <Text style={styles.headerTitle}>GoalPulse</Text>
            <Text style={styles.welcome} numberOfLines={1}>
              {user.name || user.email.split('@')[0]}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={22} color="#39FF14" />
        </TouchableOpacity>
      </View>

      <MatchList userEmail={user.email} />
      <StatusBar style="light" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 55 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 15,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#111', borderWidth: 1.5, borderColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  welcome: { color: '#39FF14', fontSize: 12, marginTop: 1, maxWidth: 180 },
  logoutBtn: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
});
