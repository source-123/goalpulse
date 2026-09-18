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

const MIN_SPLASH_TIME = 3500; // ⏱️ 3.5 secondes minimum

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState<Tab>('matches');
  const [openRoom, setOpenRoom] = useState<{ code: string; name: string } | null>(null);
  const [restoring, setRestoring] = useState(true);

  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const startTime = Date.now();

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

      // ⏱️ Attendre minimum 3.5s avant de cacher le splash
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MIN_SPLASH_TIME - elapsed);

      setTimeout(() => {
        setRestoring(false);
      }, remaining);
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
    Alert.alert('Déconnexion', 'Tu veux vraiment te déconnecter ?', [
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

  // 🎬 SPLASH SCREEN (reste visible au moins 3.5s)
  if (restoring) {
    return (
      <LinearGradient colors={['#0a0a0a', '#0f0f0f', '#0a0a0a']} style={styles.splashContainer}>
        <View style={styles.splashBox}>
          <View style={styles.splashLogoWrap}>
            <Image
              source={require('./assets/icon.png')}
              style={styles.splashImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.splashTitle}>GoalPulse</Text>
          <Text style={styles.splashSubtitle}>Tous les scores en direct</Text>
          <ActivityIndicator color="#39FF14" style={{ marginTop: 40 }} />
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
      {/* HEADER */}
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

      {/* CONTENU (padding en bas pour ne pas cacher par la nav bar) */}
      <View style={styles.content}>
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

      {/* 🎨 BARRE FLOTTANTE (plus haute sur Android) */}
      <View
        style={[
          styles.navBarWrapper,
          Platform.OS === 'android' && { bottom: 60 },
        ]}
      >
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

  // 🎬 SPLASH
  splashContainer: { flex: 1 },
  splashBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashLogoWrap: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#0a0a0a',
    borderWidth: 3, borderColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#39FF14',
    shadowOpacity: 0.9,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  splashImage: { width: 148, height: 148, borderRadius: 74 },
  splashTitle: {
    color: '#fff', fontSize: 36, fontWeight: 'bold',
    letterSpacing: 3, marginTop: 30,
  },
  splashSubtitle: {
    color: '#39FF14', fontSize: 13, marginTop: 8,
    letterSpacing: 1,
  },

  // HEADER
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

  // 📦 CONTENU (padding bas pour éviter le chevauchement)
  content: {
    flex: 1,
    paddingBottom: Platform.OS === 'android' ? 130 : 110,
  },

  // 🎨 NAV
  navBarWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 40,
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
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
    elevation: 10,
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
