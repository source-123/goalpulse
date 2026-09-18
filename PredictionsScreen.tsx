import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchLiveScores, CountryGroup, RawMatch,
  formatTime, getStatusLabel, isUpcomingStatus,
} from './liveScoreService';
import {
  subscribeMyPredictions, savePrediction, Prediction, syncUserPoints,
} from './predictionsService';
import TeamLogo from './TeamLogo';

interface Props {
  userEmail: string;
}

export default function PredictionsScreen({ userEmail }: Props) {
  const [groups, setGroups] = useState<CountryGroup[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<RawMatch | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  // Charger les matchs
  useEffect(() => {
    fetchLiveScores()
      .then(setGroups)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Écouter mes pronostics
  useEffect(() => {
    const unsub = subscribeMyPredictions(userEmail, setPredictions);
    return () => unsub();
  }, [userEmail]);

  // Index des pronostics par matchId
  const predByMatch = useMemo(() => {
    const map: Record<string, Prediction> = {};
    predictions.forEach((p) => (map[p.matchId] = p));
    return map;
  }, [predictions]);

  // Matchs à venir (uniquement)
  const upcomingGroups = useMemo(() => {
    return groups
      .map((c) => ({
        ...c,
        leagues: c.leagues
          .map((l) => ({
            ...l,
            matches: l.matches.filter((m) => isUpcomingStatus(m.status)),
          }))
          .filter((l) => l.matches.length > 0),
      }))
      .filter((c) => c.leagues.length > 0);
  }, [groups]);

  const totalUpcoming = upcomingGroups.reduce(
    (s, c) => s + c.leagues.reduce((ss, l) => ss + l.matches.length, 0),
    0
  );

  // Points totaux
  const totalPoints = useMemo(
    () => predictions.reduce((s, p) => s + (p.points || 0), 0),
    [predictions]
  );

  const openPrediction = (match: RawMatch) => {
    setSelectedMatch(match);
    const existing = predByMatch[match.id];
    if (existing) {
      setHomeScore(String(existing.homeScore));
      setAwayScore(String(existing.awayScore));
    } else {
      setHomeScore('');
      setAwayScore('');
    }
  };

  const handleSave = async () => {
    if (!selectedMatch) return;
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      Alert.alert('Erreur', 'Score invalide');
      return;
    }

    try {
      await savePrediction(userEmail, selectedMatch.id, h, a, {
        localteam: selectedMatch.localteam,
        visitorteam: selectedMatch.visitorteam,
        leaguename: selectedMatch.leaguename,
        date: selectedMatch.date,
        time: selectedMatch.time,
        scoretime: selectedMatch.scoretime,
        status: selectedMatch.status,
      });
      await syncUserPoints(userEmail);
      Alert.alert('✅ Enregistré', `Ton pronostic : ${h} - ${a}`);
      setSelectedMatch(null);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{predictions.length}</Text>
          <Text style={styles.statLabel}>Pronostics</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#FFD700' }]}>
            {totalPoints}
          </Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
      </View>

      <ScrollView>
        {/* Mes pronostics */}
        {predictions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Mes pronostics récents</Text>
            {predictions.slice(0, 5).map((p) => (
              <View key={p.matchId} style={styles.predCard}>
                <View style={styles.predHeader}>
                  <Text style={styles.predLeague}>{p.matchInfo.leaguename}</Text>
                  <View style={[
                    styles.predStatusBadge,
                    p.points >= 5 && styles.predStatusGold,
                    p.points >= 1 && p.points < 5 && styles.predStatusGreen,
                    p.points === 0 && p.status === 'wrong' && styles.predStatusRed,
                  ]}>
                    <Text style={styles.predStatusText}>
                      {p.status === 'pending' ? '⏳' : `${p.points} pts`}
                    </Text>
                  </View>
                </View>
                <View style={styles.predTeams}>
                  <Text style={styles.predTeam} numberOfLines={1}>
                    {p.matchInfo.localteam}
                  </Text>
                  <View style={styles.predScoreBox}>
                    <Text style={styles.predScore}>
                      {p.homeScore} - {p.awayScore}
                    </Text>
                  </View>
                  <Text style={[styles.predTeam, styles.predTeamRight]} numberOfLines={1}>
                    {p.matchInfo.visitorteam}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Matchs à venir */}
        <Text style={styles.sectionTitle}>
          🎯 {totalUpcoming} match{totalUpcoming > 1 ? 's' : ''} à pronostiquer
        </Text>

        {upcomingGroups.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="football-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>Aucun match à venir</Text>
          </View>
        ) : (
          upcomingGroups.map((c, ci) => (
            <View key={ci} style={styles.countryBox}>
              <Text style={styles.countryTitle}>{c.country}</Text>
              {c.leagues.map((l, li) => (
                <View key={li} style={styles.leagueBox}>
                  <Text style={styles.leagueTitle}>{l.league}</Text>
                  {l.matches.map((m, mi) => {
                    const hasPred = !!predByMatch[m.id];
                    return (
                      <TouchableOpacity
                        key={mi}
                        style={[
                          styles.matchItem,
                          hasPred && styles.matchItemPredicted,
                        ]}
                        onPress={() => openPrediction(m)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.matchTime}>
                          <Text style={styles.matchTimeText}>
                            {formatTime(m.time)}
                          </Text>
                          {hasPred && (
                            <Ionicons name="checkmark-circle" size={14} color="#39FF14" />
                          )}
                        </View>
                        <View style={styles.matchTeams}>
                          <View style={styles.matchTeamRow}>
                            <TeamLogo name={m.localteam} size={20} />
                            <Text style={styles.matchTeamText} numberOfLines={1}>
                              {m.localteam}
                            </Text>
                          </View>
                          <View style={styles.matchTeamRow}>
                            <TeamLogo name={m.visitorteam} size={20} />
                            <Text style={styles.matchTeamText} numberOfLines={1}>
                              {m.visitorteam}
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={hasPred ? 'create' : 'add-circle-outline'}
                          size={22}
                          color={hasPred ? '#39FF14' : '#666'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal de saisie */}
      {selectedMatch && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Ton pronostic</Text>
            <Text style={styles.modalLeague}>{selectedMatch.leaguename}</Text>

            <View style={styles.modalTeams}>
              <View style={styles.modalTeamCol}>
                <TeamLogo name={selectedMatch.localteam} size={40} />
                <Text style={styles.modalTeamName} numberOfLines={2}>
                  {selectedMatch.localteam}
                </Text>
              </View>
              <View style={styles.modalScoreCol}>
                <View style={styles.scoreInputRow}>
                  <TextInput
                    style={styles.scoreInput}
                    value={homeScore}
                    onChangeText={(t) => setHomeScore(t.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="0"
                    placeholderTextColor="#444"
                  />
                  <Text style={styles.scoreDash}>-</Text>
                  <TextInput
                    style={styles.scoreInput}
                    value={awayScore}
                    onChangeText={(t) => setAwayScore(t.replace(/[^0-9]/g, ''))}
                    keyboardType="numeric"
                    maxLength={2}
                    placeholder="0"
                    placeholderTextColor="#444"
                  />
                </View>
              </View>
              <View style={styles.modalTeamCol}>
                <TeamLogo name={selectedMatch.visitorteam} size={40} />
                <Text style={styles.modalTeamName} numberOfLines={2}>
                  {selectedMatch.visitorteam}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setSelectedMatch(null)}
              >
                <Text style={styles.modalBtnTextCancel}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSave}
              >
                <Ionicons name="checkmark" size={20} color="#000" />
                <Text style={styles.modalBtnTextSave}>Valider</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.pointsInfo}>
              🎯 Score exact: <Text style={styles.pointsHighlight}>5 pts</Text>
              {'\n'}✌️ Bon écart: <Text style={styles.pointsHighlight}>3 pts</Text>
              {'\n'}✅ Bon vainqueur: <Text style={styles.pointsHighlight}>1 pt</Text>
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 18, marginTop: 15, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  statCard: {
    flex: 1, backgroundColor: '#171717',
    padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#262626',
    alignItems: 'center',
  },
  statValue: { color: '#39FF14', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#888', fontSize: 11, marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold',
    marginBottom: 10, letterSpacing: 0.5,
  },

  predCard: {
    backgroundColor: '#171717', padding: 12, borderRadius: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#262626',
  },
  predHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  predLeague: { color: '#666', fontSize: 11 },
  predStatusBadge: {
    backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  predStatusGold: { backgroundColor: '#FFD70030' },
  predStatusGreen: { backgroundColor: '#39FF1430' },
  predStatusRed: { backgroundColor: '#FF336630' },
  predStatusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  predTeams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  predTeam: { flex: 1, color: '#fff', fontSize: 13 },
  predTeamRight: { textAlign: 'right' },
  predScoreBox: {
    backgroundColor: '#0a0a0a', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: '#39FF1444',
  },
  predScore: { color: '#39FF14', fontSize: 15, fontWeight: 'bold' },

  countryBox: { marginBottom: 15 },
  countryTitle: {
    color: '#aaa', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
  },
  leagueBox: { marginBottom: 10 },
  leagueTitle: { color: '#39FF14', fontSize: 11, fontWeight: 'bold', marginBottom: 6 },

  matchItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#171717', padding: 10, borderRadius: 10,
    marginBottom: 6, borderWidth: 1, borderColor: '#262626',
  },
  matchItemPredicted: { borderColor: '#39FF1444' },
  matchTime: { alignItems: 'center', width: 45 },
  matchTimeText: { color: '#666', fontSize: 11, fontWeight: '600' },
  matchTeams: { flex: 1, gap: 4 },
  matchTeamRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  matchTeamText: { color: '#fff', fontSize: 12, flex: 1 },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000CC', justifyContent: 'center',
    alignItems: 'center', padding: 20,
  },
  modalSheet: {
    backgroundColor: '#111', borderRadius: 20, padding: 20,
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: '#333',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  modalLeague: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  modalTeams: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  modalTeamCol: { flex: 1, alignItems: 'center', gap: 6 },
  modalTeamName: { color: '#fff', fontSize: 12, textAlign: 'center' },
  modalScoreCol: { alignItems: 'center' },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreInput: {
    width: 50, height: 60, backgroundColor: '#0a0a0a',
    borderWidth: 2, borderColor: '#39FF14', borderRadius: 12,
    color: '#39FF14', fontSize: 26, fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreDash: { color: '#555', fontSize: 22, fontWeight: 'bold' },

  modalActions: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  modalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  modalBtnCancel: { backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333' },
  modalBtnSave: { backgroundColor: '#39FF14' },
  modalBtnTextCancel: { color: '#888', fontSize: 14, fontWeight: '600' },
  modalBtnTextSave: { color: '#000', fontSize: 14, fontWeight: 'bold' },

  pointsInfo: {
    color: '#666', fontSize: 11, textAlign: 'center', lineHeight: 18,
  },
  pointsHighlight: { color: '#39FF14', fontWeight: 'bold' },
});
