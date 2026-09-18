import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, get } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';
import {
  ALL_BADGES, LEVELS,
  getLevelFromPoints, getNextLevel,
  subscribeUserBadges, checkAndUnlockBadges,
} from './badgesService';
import { useLanguage } from './LanguageContext';
import { LANGUAGES } from './i18n';

interface Props {
  userEmail: string;
  userName: string;
}

export default function ProfileScreen({ userEmail, userName }: Props) {
  const { lang, t, setLang } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [totalBets, setTotalBets] = useState(0);
  const [correctBets, setCorrectBets] = useState(0);
  const [exactBets, setExactBets] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);
  const [unlockedBadges, setUnlockedBadges] = useState<string[]>([]);

  const userKey = getUserKey(userEmail);

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

        const rooms = roomsSnap.val() || {};
        let count = 0;
        Object.keys(rooms).forEach((code) => {
          if (rooms[code].members && rooms[code].members[userKey]) count++;
        });
        setRoomsCount(count);

        await checkAndUnlockBadges(userEmail);
      } catch (e) {
        console.error('Erreur load profile:', e);
      }
      setLoading(false);
    };
    load();
  }, [userKey, userEmail]);

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
        <Text style={styles.loadingText}>{t.loading}</Text>
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
      {/* 👤 HERO */}
      <View style={styles.hero}>
        <View style={styles.avatarWrap}>
          <View style={[styles.avatarRing, { borderColor: currentLevel.color }]}>
            <View style={styles.avatarInner}>
              <Image
                source={require('./assets/icon.png')}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            </View>
          </View>
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

      {/* ⚡ PROGRESSION */}
      {nextLevel && (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>
              {t.nextLevel} : {nextLevel.icon} {nextLevel.name}
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
            + {nextLevel.minPoints - points} {t.morePoints}
          </Text>
        </View>
      )}

      {/* 💎 STATS */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#39FF14' }]}>{points}</Text>
          <Text style={styles.statLabel}>{t.pointsLabel}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#00BFFF' }]}>{totalBets}</Text>
          <Text style={styles.statLabel}>{t.betsLabel}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#FFD700' }]}>{exactBets}</Text>
          <Text style={styles.statLabel}>{t.exacts}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#9D4EDD' }]}>{winRate}%</Text>
          <Text style={styles.statLabel}>{t.winRate}</Text>
        </View>
      </View>

      {/* 📊 SECONDAIRES */}
      <View style={styles.secondaryRow}>
        <View style={styles.secondaryBox}>
          <Ionicons name="checkmark-circle" size={20} color="#39FF14" />
          <Text style={styles.secondaryValue}>{correctBets}</Text>
          <Text style={styles.secondaryLabel}>{t.ok}</Text>
        </View>
        <View style={styles.secondaryBox}>
          <Ionicons name="game-controller" size={20} color="#FF6B6B" />
          <Text style={styles.secondaryValue}>{roomsCount}</Text>
          <Text style={styles.secondaryLabel}>{t.rooms}</Text>
        </View>
        <View style={styles.secondaryBox}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.secondaryValue}>{unlockedBadges.length}</Text>
          <Text style={styles.secondaryLabel}>{t.badges}</Text>
        </View>
      </View>

      {/* 🌐 LANGUE */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🌐 {lang === 'fr' ? 'Langue' : lang === 'en' ? 'Language' : 'اللغة'}
        </Text>
        <View style={styles.langRow}>
          {LANGUAGES.map((l) => {
            const isActive = lang === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                style={[styles.langBtn, isActive && styles.langBtnActive]}
                onPress={() => setLang(l.code)}
                activeOpacity={0.7}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={[styles.langName, isActive && styles.langNameActive]}>
                  {l.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 🏅 BADGES */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>🏅 {t.badges}</Text>
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
                  style={[styles.badgeName, isUnlocked && { color: badge.color }]}
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
        <Text style={styles.sectionTitle}>📈 {t.levels}</Text>
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
                <Text style={[styles.levelCardName, isReached && { color: lvl.color }]}>
                  {t.level} {lvl.level} • {lvl.name}
                </Text>
                <Text style={styles.levelCardPoints}>{lvl.minPoints}+ {t.pointsLabel}</Text>
              </View>
              {isCurrent && (
                <View style={[styles.currentPill, { backgroundColor: lvl.color }]}>
                  <Text style={styles.currentPillText}>★</Text>
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

  hero: { alignItems: 'center', paddingVertical: 25 },
  avatarWrap: { position: 'relative', marginBottom: 15 },
  avatarRing: {
    width: 110, height: 110, borderRadius: 55,
    padding: 3,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3,
  },
  avatarInner: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 92, height: 92, borderRadius: 46 },
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

  // 🌐 LANGUE
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    gap: 6,
  },
  langBtnActive: {
    backgroundColor: '#39FF1415',
    borderColor: '#39FF14',
  },
  langFlag: { fontSize: 24 },
  langName: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  langNameActive: {
    color: '#39FF14',
  },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5,
    marginBottom: 12,
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
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8,
  },
  currentPillText: {
    color: '#000', fontSize: 11, fontWeight: 'bold',
  },
});
