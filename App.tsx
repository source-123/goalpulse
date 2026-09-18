import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet, View, Text, TouchableOpacity, Alert,
  Platform, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { onAuthStateChanged } from 'firebase/auth';
import LoginScreen from './LoginScreen';
import MatchList from './MatchList';
import Standings from './Standings';
import RoomsScreen from './RoomsScreen';
import RoomDetail from './RoomDetail';
import ProfileScreen from './ProfileScreen';
import { logout } from './authConfig';
import { saveUserProfile } from './userService';
import { auth } from './firebaseConfig';
import { registerForPushNotifications } from './notificationService';
import { LanguageProvider, useLanguage } from './LanguageContext';

interface User {
  email: string;
  isSignup: boolean;
  google?: boolean;
  name?: string | null;
}

type Tab = 'matches' | 'standings' | 'rooms' | 'profile';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('matches');
  const [openRoom, setOpenRoom] = useState<{ code: string; name: string } | null>(null);
  const [restoring, setRestoring] = useState(true);

  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          email: firebaseUser.email || '',
          isSignup: false,
          google: true,
          name: firebaseUser.displayName,
        });
      } else {
        setUser(null);
      }
      setRestoring(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (user?.email) {
      saveUserProfile(user.email, user.name || null).catch(console.error);
      registerForPushNotifications(user.email).catch(console.error);
    }
  }, [user]);

  const handleLogout = () => {
    Alert.alert(t.signIn, 'Vous déconnecter ?', [
      { text: t.cancel, style: 'cancel' },
      {
        text: t.signIn,
        style: 'destructive',
        onPress: async () => {
          await logout();
          setUser(null);
        },
      },
    ]);
  };

  if (restoring) {
    return (
      <LinearGradient colors={['#0a0a0a', '#0f0f0f']} style={styles.container}>
        <View style={styles.splashBox}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.splashImage}
            resizeMode="contain"
          />
          <Text style={styles.splashTitle}>GoalPulse</Text>
          <ActivityIndicator color="#39FF14" style={{ marginTop: 30 }} />
        </View>
        <StatusBar style="light" />
      </LinearGradient>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={(u) => setUser(u)} />
        <StatusBar style="light" />
      </>
    );
  }

  const displayName = user.name || user.email.split('@')[0];

  if (openRoom) {
    return (
      <LinearGradient colors={['#0a0a0a', '#0f0f0f', '#151515']} style={styles.container}>
        <RoomDetail
          code={openRoom.code}
          name={openRoom.name}
          userEmail={user.email}
          userName={displayName}
          onClose={() => setOpenRoom(null)}
        />
        <StatusBar style="light" />
      </LinearGradient>
    );
  }

  const TABS: Array<{ key: Tab; icon: any; activeIcon: any; label: string }> = [
    { key: 'matches', icon: 'football-outline', activeIcon: 'football', label: t.matches },
    { key: 'standings', icon: 'stats-chart-outline', activeIcon: 'stats-chart', label: t.standings },
    { key: 'rooms', icon: 'game-controller-outline', activeIcon: 'game-controller', label: t.rooms },
    { key: 'profile', icon: 'person-outline', activeIcon: 'person', label: t.profile },
  ];

  return (
    <LinearGradient colors={['#0a0a0a', '#0f0f0f', '#151515']} style={styles.container}>
      <View style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
        <View style={[styles.headerLeft, isRTL && { flexDirection: 'row-reverse' }]}>
          <View style={styles.logoCircle}>
            <Image
              source={require('./assets/icon.png')}
              style={styles.headerLogo}
              resizeMode="contain"
            />
          </View>
          <View style={isRTL && { alignItems: 'flex-end' }}>
            <Text style={styles.headerTitle}>GoalPulse</Text>
            <Text style={styles.welcome} numberOfLines={1}>{displayName}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Ionicons name="log-out-outline" size={18} color="#39FF14" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, paddingBottom: 100 }}>
        {tab === 'matches' && <MatchList userEmail={user.email} />}
        {tab === 'standings' && <Standings />}
        {tab === 'rooms' && (
          <RoomsScreen
            userEmail={user.email}
            userName={displayName}
            onOpenRoom={(code, name) => setOpenRoom({ code, name })}
          />
        )}
        {tab === 'profile' && (
          <ProfileScreen userEmail={user.email} userName={displayName} />
        )}
      </View>

      <View style={styles.navBarWrapper}>
        <View style={[styles.navBar, isRTL && { flexDirection: 'row-reverse' }]}>
          {TABS.map((tabItem) => {
            const isActive = tab === tabItem.key;
            return (
              <TouchableOpacity
                key={tabItem.key}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => setTab(tabItem.key)}
                activeOpacity={0.7}
              >
                {isActive && (
                  <LinearGradient
                    colors={['#39FF14', '#2BC40F']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.activePill}
                  />
                )}
                <View style={[styles.navItemContent, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Ionicons
                    name={isActive ? tabItem.activeIcon : tabItem.icon}
                    size={20}
                    color={isActive ? '#000' : '#555'}
                  />
                  <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                    {tabItem.label}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <StatusBar style="light" />
    </LinearGradient>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 55 },
  splashBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashImage: { width: 140, height: 140, borderRadius: 70 },
  splashTitle: {
    color: '#fff', fontSize: 32, fontWeight: 'bold',
    letterSpacing: 2, marginTop: 25,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, marginBottom: 15,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#111', borderWidth: 1.5, borderColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  headerLogo: { width: 36, height: 36, borderRadius: 18 },
  headerTitle: {
    fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5,
  },
  welcome: {
    color: '#39FF14', fontSize: 11, marginTop: 1, maxWidth: 180,
  },
  logoutBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  navBarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 20 : 40,
    left: 0, right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#0f0f0f',
    borderRadius: 30, padding: 5,
    borderWidth: 1, borderColor: '#1f1f1f',
    width: '100%', maxWidth: 400,
  },
  navItem: {
    flex: 1, height: 52, borderRadius: 26,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  navItemActive: {},
  activePill: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 26,
  },
  navItemContent: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5, zIndex: 1,
  },
  navLabel: { color: '#555', fontSize: 10, fontWeight: '600' },
  navLabelActive: { color: '#000', fontWeight: 'bold' },
});
