import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import LoginScreen from './LoginScreen';
import MatchList from './MatchList';
import Standings from './Standings';
import RoomsScreen from './RoomsScreen';
import RoomDetail from './RoomDetail';
import { logout } from './authConfig';
import { saveUserProfile } from './userService';

interface User {
  email: string;
  isSignup: boolean;
  google?: boolean;
  name?: string | null;
}

type Tab = 'matches' | 'standings' | 'rooms';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('matches');
  const [openRoom, setOpenRoom] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    if (user?.email) {
      saveUserProfile(user.email, user.name || null).catch(console.error);
    }
  }, [user]);

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

  const displayName = user.name || user.email.split('@')[0];

  // Si un salon est ouvert → plein écran
  if (openRoom) {
    return (
      <LinearGradient
        colors={['#0a0a0a', '#0f0f0f', '#151515']}
        style={styles.container}
      >
        <RoomDetail
          code={openRoom.code}
          name={openRoom.name}
          userEmail={user.email}
          onClose={() => setOpenRoom(null)}
        />
        <StatusBar style="light" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0a0a0a', '#0f0f0f', '#151515']}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoCircle}>
            <Ionicons name="football" size={20} color="#39FF14" />
          </View>
          <View>
            <Text style={styles.headerTitle}>GoalPulse</Text>
            <Text style={styles.welcome} numberOfLines={1}>{displayName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={20} color="#39FF14" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        {tab === 'matches' && <MatchList userEmail={user.email} />}
        {tab === 'standings' && <Standings />}
        {tab === 'rooms' && (
          <RoomsScreen
            userEmail={user.email}
            userName={displayName}
            onOpenRoom={(code, name) => setOpenRoom({ code, name })}
          />
        )}
      </View>

      <View style={styles.bottomTabs}>
        {[
          { key: 'matches', icon: 'football', label: 'Matchs' },
          { key: 'standings', icon: 'stats-chart', label: 'Classements' },
          { key: 'rooms', icon: 'game-controller', label: 'Salons' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={styles.bottomTab}
            onPress={() => setTab(t.key as Tab)}
          >
            <Ionicons
              name={(tab === t.key ? t.icon : `${t.icon}-outline`) as any}
              size={22}
              color={tab === t.key ? '#39FF14' : '#555'}
            />
            <Text
              style={[
                styles.bottomTabText,
                tab === t.key && styles.bottomTabTextActive,
              ]}
            >
              {t.label}
            </Text>
            {tab === t.key && <View style={styles.bottomTabIndicator} />}
          </TouchableOpacity>
        ))}
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
    flex: 1, alignItems: 'center', justifyContent: 'center',
    gap: 3, position: 'relative',
  },
  bottomTabText: { color: '#555', fontSize: 10, fontWeight: '600' },
  bottomTabTextActive: { color: '#39FF14' },
  bottomTabIndicator: {
    position: 'absolute', top: -9,
    width: 30, height: 2,
    backgroundColor: '#39FF14', borderRadius: 1,
  },
});
