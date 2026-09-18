import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ref, get } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';
import {
  ALL_BADGES, Badge, LEVELS, Level,
  getLevelFromPoints, getNextLevel,
  subscribeUserBadges, checkAndUnlockBadges,
} from './badgesService';

interface Props {
  userEmail: string;
  userName: string;
}

export default function ProfileScreen({ userEmail, userName }: Props) {
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [totalBets, setTotalBets] = useState(0);
  const [correctBets, setCorrectBets] = useState(0);
  const [exactBets, setExactBets] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);

  const userKey = getUserKey(userEmail);

  // Charger les stats
  useEffect(() => {
    const load = async () => {
      try {
        const predsSnap = await get(ref(database, `users/${userKey}/predictions`));
        const roomsSnap = await get(ref(database, `rooms`));

        const preds = predsSnap.val() || {};
        const predList = Object.values(preds) as any[];

        const total = predList.length;
        const correct = predList.filter((p: any) => p.points > 0).length;
        const exact = predList.filter((p: any) => p.points === 5).length;
        const pts = predList.reduce((s: number, p: any) => s + (p.points || 0), 0);

        setTotalBets(total);
        setCorrectBets(correct);
        setExactBets(exact);
        setPoints(pts);

        // Rooms
        const rooms = roomsSnap.val() || {};
        let count = 0;
        Object.keys(rooms).forEach((code) => {
          if (rooms[code].members && rooms[code].members[userKey]) count++;
        });
        setRoomsCount(count);

        // Vérifier les badges
        await checkAndUnlockBadges(userEmail);
      } catch (e) {
        console.error('Erreur load profile:', e);
      }
      setLoading(false);
    };
    load();
  }, [userKey, userEmail]);

  // Listener badges
  useEffect(() => {
    const unsub = subscribeUserBadges(userEmail, setUnlockedBadges);
    return () => unsub();
  }, [userEmail]);

  const currentLevel = getLevelFromPoints(points);
  const nextLevel = getNextLevel(points);
  const progressToNext = nextLevel
    ? ((points - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100
    : 100;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  const winRate = totalBets > 0 ? Math.round((correctBets / totalBets) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* 👤 HERO PROFILE */}
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <LinearGradient
            colors={[currentLevel.color, currentLevel.color + '80']}
            style={styles.avatarRing}
          >
            <View style={styles.avatarInner}>
              <Image
                source={require('./assets/icon.png')}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            </View>
          </LinearGradient>
          <View style={[styles.levelBadge, { backgroundColor: currentLevel.color }]}>
            <Text style={styles.levelBadgeText}>Nv.{currentLevel.level}</Text>
          </View>
        </View>

        <Text style={styles.displayName} numberOfLines={1}>{userName}</Text>
        <View style={styles.levelRow}>
          <Text style={styles.levelIcon}>{currentLevel.icon}</Text>
          <Text style={[styles.levelName, { color: currentLevel.color }]}>
            {currentLevel.name}
          </Text>
        </View>
      </View>

      {/* ⚡ PROGRESSION VERS NIVEAU SUIVANT */}
      {nextLevel && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              Prochain : {nextLevel.icon} {nextLevel.name}
            </Text>
            <Text style={styles.progressPoints}>
              {points} / {nextLevel.minPoints}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressToNext}%`, backgroundColor: nextLevel.color },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            Encore {nextLevel.minPoints - points} points
          </Text>
        </View>
      )}

      {/* 💎 STATS GRID */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#39FF14' }]}>{points}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#00BFFF' }]}>{totalBets}</Text>
          <Text style={styles.statLabel}>Paris</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FFD700' }]}>{exactBets}</Text>
          <Text style={styles.statLabel}>Exacts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#9D4EDD' }]}>{winRate}%</Text>
          <Text style={styles.statLabel}>Réussite</Text>
        </View>
      </View>

      {/* 📊 STATS SECONDAIRES */}
      <View style={styles.secondaryRow}>
        <View style={styles.secondaryBox}>
          <Ionicons name="checkmark-circle" size={20} color="#39FF14" />
          <Text style={styles.secondaryValue}>{correctBets}</Text>
          <Text style={styles.secondaryLabel}>Gagnés</Text>
        </View>
        <View style={styles.secondaryBox}>
          <Ionicons name="game-controller" size={20} color="#FF6B6B" />
          <Text style={styles.secondaryValue}>{roomsCount}</Text>
          <Text style={styles.secondaryLabel}>Salons</Text>
        </View>
        <View style={styles.secondaryBox}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.secondaryValue}>{unlockedBadges.length}</Text>
          <Text style={styles.secondaryLabel}>Badges</Text>
        </View>
      </View>

      {/* 🏅 BADGES */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏅 Badges</Text>
          <Text style={styles.sectionCount}>
            {unlockedBadges.length} / {ALL_BADGES.length}
          </Text>
        </View>

        <View style={styles.badgesGrid}>
          {ALL_BADGES.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            return (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  isUnlocked && { borderColor: badge.color, backgroundColor: badge.color + '15' },
                ]}
              >
                <Text style={[styles.badgeIcon, !isUnlocked && { opacity: 0.3 }]}>
                  {isUnlocked ? badge.icon : '🔒'}
                </Text>
                <Text
                  style={[
                    styles.badgeName,
                    isUnlocked && { color: badge.color },
                  ]}
                  numberOfLines={1}
                >
                  {badge.name}
                </Text>
                <Text style={styles.badgeDesc} numberOfLines={2}>
                  {badge.description}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* 📈 NIVEAUX */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Niveaux</Text>
        {LEVELS.map((lvl) => {
          const isCurrent = lvl.level === currentLevel.level;
          const isReached = points >= lvl.minPoints;
          return (
            <View
              key={lvl.level}
              style={[
                styles.levelCard,
                isCurrent && { borderColor: lvl.color, backgroundColor: lvl.color + '15' },
              ]}
            >
              <Text style={[styles.levelCardIcon, !isReached && { opacity: 0.3 }]}>
                {lvl.icon}
              </Text>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.levelCardName,
                    isReached && { color: lvl.color },
                  ]}
                >
                  Niveau {lvl.level} • {lvl.name}
                </Text>
                <Text style={styles.levelCardPoints}>
                  {lvl.minPoints}+ points
                </Text>
              </View>
              {isCurrent && (
                <View style={[styles.currentPill, { backgroundColor: lvl.color }]}>
                  <Text style={styles.currentPillText}>TU ES ICI</Text>
                </View>
              )}
              {isReached && !isCurrent && (
                <Ionicons name="checkmark-circle" size={20} color={lvl.color} />
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#39FF14', marginTop: 10 },

  // 👤 HERO
  hero: { alignItems: 'center', paddingVertical: 25 },
  avatarWrap: { position: 'relative', marginBottom: 15 },
  avatarRing: {
    width: 110, height: 110, borderRadius: 55,
    padding: 3,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInner: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  levelBadge: {
    position: 'absolute',
    bottom: -4, right: -4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 2, borderColor: '#0a0a0a',
  },
  levelBadgeText: { color: '#000', fontSize: 11, fontWeight: 'bold' },

  displayName: {
    color: '#fff', fontSize: 22, fontWeight: 'bold', letterSpacing: 0.5,
    maxWidth: '90%',
  },
  levelRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 6, marginTop: 6,
  },
  levelIcon: { fontSize: 16 },
  levelName: { fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 },

  // ⚡ PROGRESSION
  progressCard: {
    backgroundColor: '#141414',
    borderRadius: 16, padding: 16,
    marginBottom: 16,
    borderWidth: 1, borderColor: '#1f1f1f',
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  progressLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  progressPoints: { color: '#39FF14', fontSize: 13, fontWeight: 'bold' },
  progressBar: {
    height: 10, backgroundColor: '#0a0a0a',
    borderRadius: 5, overflow: 'hidden',
    borderWidth: 1, borderColor: '#1f1f1f',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  progressHint: {
    color: '#666', fontSize: 11, marginTop: 8, textAlign: 'center',
  },

  // 💎 STATS GRID
  statsGrid: {
    flexDirection: 'row', gap: 10, marginBottom: 12,
  },
  statBox: {
    flex: 1, backgroundColor: '#141414',
    borderRadius: 14, padding: 14,
    alignItems: 'center',
    borderWidth: 1, borderColor: '#1f1f1f',
  },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#666', fontSize: 11, marginTop: 4, fontWeight: '600' },

  // 📊 SECONDAIRE
  secondaryRow: {
    flexDirection: 'row', gap: 10, marginBottom: 24,
  },
  secondaryBox: {
    flex: 1, backgroundColor: '#0f0f0f',
    borderRadius: 12, padding: 12,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: '#1a1a1a',
  },
  secondaryValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryLabel: { color: '#555', fontSize: 10, fontWeight: '600' },

  // 🏅 BADGES
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5,
  },
  sectionCount: { color: '#39FF14', fontSize: 13, fontWeight: 'bold' },

  badgesGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  badgeCard: {
    width: '31%',
    aspectRatio: 1,
    backgroundColor: '#0f0f0f',
    borderRadius: 14, padding: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#1f1f1f',
    gap: 4,
  },
  badgeIcon: { fontSize: 28 },
  badgeName: {
    color: '#666', fontSize: 10, fontWeight: 'bold',
    textAlign: 'center',
  },
  badgeDesc: {
    color: '#444', fontSize: 8, textAlign: 'center',
  },

  // 📈 NIVEAUX
  levelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0f0f0f', borderRadius: 14,
    padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#1f1f1f',
  },
  levelCardIcon: { fontSize: 24 },
  levelCardName: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  levelCardPoints: { color: '#555', fontSize: 11, marginTop: 2 },
  currentPill: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  currentPillText: {
    color: '#000', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5,
  },
});
