import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, View, Text, TouchableOpacity, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LoginScreen from './LoginScreen';
import MatchList from './MatchList';
import Standings from './Standings';
import { logout } from './authConfig';

interface User {
  email: string;
  isSignup: boolean;
  google?: boolean;
  name?: string | null;
}

type Tab = 'matches' | 'standings';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('matches');

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
      colors={['#0a0a0a', '#0f0f0f', '#151515']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Ionicons name="football" size={20} color="#39FF14" />
          </View>
          <View>
            <Text style={styles.headerTitle}>GoalPulse</Text>
            <Text style={styles.welcome} numberOfLines={1}>
              {user.name || user.email.split('@')[0]}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#39FF14" />
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      <View style={{ flex: 1 }}>
        {tab === 'matches' ? (
          <MatchList userEmail={user.email} />
        ) : (
          <Standings />
        )}
      </View>

      {/* Bottom Tabs */}
      <View style={styles.bottomTabs}>
        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setTab('matches')}
        >
          <Ionicons
            name={tab === 'matches' ? 'football' : 'football-outline'}
            size={22}
            color={tab === 'matches' ? '#39FF14' : '#555'}
          />
          <Text
            style={[
              styles.bottomTabText,
              tab === 'matches' && styles.bottomTabTextActive,
            ]}
          >
            Matchs
          </Text>
          {tab === 'matches' && <View style={styles.bottomTabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bottomTab}
          onPress={() => setTab('standings')}
        >
          <Ionicons
            name={tab === 'standings' ? 'trophy' : 'trophy-outline'}
            size={22}
            color={tab === 'standings' ? '#39FF14' : '#555'}
          />
          <Text
            style={[
              styles.bottomTabText,
              tab === 'standings' && styles.bottomTabTextActive,
            ]}
          >
            Classement
          </Text>
          {tab === 'standings' && <View style={styles.bottomTabIndicator} />}
        </TouchableOpacity>
      </View>

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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#111', borderWidth: 1.5, borderColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  welcome: { color: '#39FF14', fontSize: 11, marginTop: 1, maxWidth: 180 },
  logoutBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },

  bottomTabs: {
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    paddingTop: 8,
    paddingBottom: 25,
  },
  bottomTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  bottomTabText: {
    color: '#555', fontSize: 11, fontWeight: '600',
  },
  bottomTabTextActive: { color: '#39FF14' },
  bottomTabIndicator: {
    position: 'absolute',
    top: -9,
    width: 30,
    height: 2,
    backgroundColor: '#39FF14',
    borderRadius: 1,
  },
});
