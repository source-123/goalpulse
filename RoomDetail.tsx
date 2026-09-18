import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  subscribeRoomMembers, subscribeRoomPredictions,
  saveRoomPrediction, leaveRoom, RoomMember, RoomPrediction,
  computeRoomLeaderboard,
} from './roomService';
import { getUserKey } from './userService';
import {
  fetchLiveScores, CountryGroup, RawMatch,
  formatTime, isUpcomingStatus,
} from './liveScoreService';
import TeamLogo from './TeamLogo';

interface Props {
  code: string;
  name: string;
  userEmail: string;
  onClose: () => void;
}

type Tab = 'predict' | 'leaderboard' | 'mine';

export default function RoomDetail({ code, name, userEmail, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('predict');
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, RoomPrediction>>>({});
  const [groups, setGroups] = useState<CountryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<RawMatch | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const myKey = getUserKey(userEmail);

  useEffect(() => {
    fetchLiveScores().then(setGroups).catch(() => {}).finally(() => setLoading(false));
    const unsubMembers = subscribeRoomMembers(code, setMembers);
    const unsubPreds = subscribeRoomPredictions(code, setPredictions);
    return () => {
      unsubMembers();
      unsubPreds();
    };
  }, [code]);

  // Classement
  const leaderboard = useMemo(
    () => computeRoomLeaderboard(members, predictions),
    [members, predictions]
  );

  // Mes pronostics dans ce salon
  const myPreds = useMemo(() => predictions[myKey] || {}, [predictions, myKey]);

  // Matchs à venir
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

  const openPrediction = (match: RawMatch) => {
    setSelectedMatch(match);
    const existing = myPreds[match.id];
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
      await saveRoomPrediction(code, userEmail, selectedMatch.id, h, a, {
        localteam: selectedMatch.localteam,
        visitorteam: selectedMatch.visitorteam,
        leaguename: selectedMatch.leaguename,
        date: selectedMatch.date,
        time: selectedMatch.time,
        scoretime: selectedMatch.scoretime,
        status: selectedMatch.status,
      });
      Alert.alert('✅ Enregistré', `Ton pronostic : ${h} - ${a}`);
      setSelectedMatch(null);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎮 Rejoins mon salon GoalPulse "${name}" !\n\nCode : ${code}\n\nTélécharge l'app et entre ce code pour jouer avec moi.`,
      });
    } catch (e) {}
  };

  const handleLeave = () => {
    Alert.alert(
      'Quitter',
      `Quitter le salon "${name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            await leaveRoom(code, userEmail);
            onClose();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.fullCenter}>
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
          <Text style={styles.headerCode}>{code}</Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-social" size={20} color="#39FF14" />
        </TouchableOpacity>
      </View>

      {/* Sous-tabs */}
      <View style={styles.tabsRow}>
        {[
          { key: 'predict', label: '🎯 Pronos' },
          { key: 'leaderboard', label: '🏆 Classement' },
          { key: 'mine', label: '📋 Mes paris' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key as Tab)}
          >
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu */}
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {tab === 'predict' && (
          <>
            <Text style={styles.sectionTitle}>
              {totalUpcoming} match{totalUpcoming > 1 ? 's' : ''} à pronostiquer
            </Text>
            {upcomingGroups.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="football-outline" size={50} color="#333" />
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
                        const hasPred = !!myPreds[m.id];
                        return (
                          <TouchableOpacity
                            key={mi}
                            style={[styles.matchItem, hasPred && styles.matchItemPredicted]}
                            onPress={() => openPrediction(m)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.matchTime}>
                              <Text style={styles.matchTimeText}>{formatTime(m.time)}</Text>
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
          </>
        )}

        {tab === 'leaderboard' && (
          <>
            <Text style={styles.sectionTitle}>
              🏆 Classement du salon ({members.length} joueur{members.length > 1 ? 's' : ''})
            </Text>
            {leaderboard.length === 0 ? (
              <View style={styles.center}>
                <Text style={styles.emptyText}>Aucun joueur</Text>
              </View>
            ) : (
              leaderboard.map((m, i) => {
                const isMe = m.userKey === myKey;
                return (
                  <View key={m.userKey} style={[styles.lbRow, isMe && styles.lbRowMe]}>
                    <View style={[styles.lbRank, i === 0 && styles.lbRankGold, i === 1 && styles.lbRankSilver, i === 2 && styles.lbRankBronze]}>
                      <Text style={styles.lbRankText}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </Text>
                    </View>
                    <View style={styles.lbInfo}>
                      <Text style={styles.lbName} numberOfLines={1}>
                        {m.name}{isMe ? ' (toi)' : ''}
                      </Text>
                      <Text style={styles.lbMeta}>
                        {m.totalPreds} prono{m.totalPreds > 1 ? 's' : ''} • {m.exactCount} exact
                      </Text>
                    </View>
                    <View style={styles.lbPoints}>
                      <Text style={styles.lbPointsText}>{m.points}</Text>
                      <Text style={styles.lbPointsLabel}>pts</Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {tab === 'mine' && (
          <>
            <Text style={styles.sectionTitle}>
              📋 Mes pronostics ({Object.keys(myPreds).length})
            </Text>
            {Object.keys(myPreds).length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="clipboard-outline" size={50} color="#333" />
                <Text style={styles.emptyText}>Aucun pronostic</Text>
                <Text style={styles.emptySubtext}>
                  Va dans l'onglet Pronos pour commencer
                </Text>
              </View>
            ) : (
              Object.values(myPreds).map((p) => (
                <View key={p.matchId} style={styles.mineCard}>
                  <View style={styles.mineHeader}>
                    <Text style={styles.mineLeague}>{p.matchInfo.leaguename}</Text>
                    <View style={[
                      styles.minePointsBadge,
                      p.points >= 5 && { backgroundColor: '#FFD70030' },
                      p.points >= 1 && p.points < 5 && { backgroundColor: '#39FF1430' },
                      p.points === 0 && p.status === 'wrong' && { backgroundColor: '#FF336630' },
                    ]}>
                      <Text style={styles.minePointsText}>
                        {p.status === 'pending' ? '⏳ En attente' : `${p.points} pts`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.mineTeams}>
                    <Text style={styles.mineTeam} numberOfLines={1}>{p.matchInfo.localteam}</Text>
                    <View style={styles.mineScoreBox}>
                      <Text style={styles.mineScore}>{p.homeScore} - {p.awayScore}</Text>
                    </View>
                    <Text style={[styles.mineTeam, styles.mineTeamRight]} numberOfLines={1}>
                      {p.matchInfo.visitorteam}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
          <Ionicons name="exit-outline" size={16} color="#FF3366" />
          <Text style={styles.leaveText}>Quitter le salon</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Modal saisie */}
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
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleSave}
              >
                <Ionicons name="checkmark" size={20} color="#000" />
                <Text style={styles.modalBtnSaveText}>Valider</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fullCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  center: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 12, marginTop: 4, textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 15, marginBottom: 15,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  headerTitleBox: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerCode: { color: '#39FF14', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  shareBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#39FF14',
  },

  tabsRow: {
    flexDirection: 'row', gap: 6, marginBottom: 15, paddingHorizontal: 15,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  tabText: { color: '#888', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#000' },

  sectionTitle: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold',
    marginBottom: 10, paddingHorizontal: 15, letterSpacing: 0.5,
  },

  countryBox: { marginBottom: 15, paddingHorizontal: 15 },
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
  matchTime: { alignItems: 'center', width: 45, gap: 2 },
  matchTimeText: { color: '#666', fontSize: 11, fontWeight: '600' },
  matchTeams: { flex: 1, gap: 4 },
  matchTeamRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  matchTeamText: { color: '#fff', fontSize: 12, flex: 1 },

  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#171717', padding: 12, borderRadius: 12,
    marginBottom: 8, marginHorizontal: 15, borderWidth: 1, borderColor: '#262626',
  },
  lbRowMe: { borderColor: '#39FF14', backgroundColor: '#39FF1410' },
  lbRank: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  lbRankGold: { backgroundColor: '#FFD70020', borderColor: '#FFD700' },
  lbRankSilver: { backgroundColor: '#C0C0C020', borderColor: '#C0C0C0' },
  lbRankBronze: { backgroundColor: '#CD7F3220', borderColor: '#CD7F32' },
  lbRankText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  lbInfo: { flex: 1 },
  lbName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  lbMeta: { color: '#666', fontSize: 11, marginTop: 2 },
  lbPoints: { alignItems: 'flex-end' },
  lbPointsText: { color: '#39FF14', fontSize: 20, fontWeight: 'bold' },
  lbPointsLabel: { color: '#666', fontSize: 9, fontWeight: '600' },

  mineCard: {
    backgroundColor: '#171717', padding: 12, borderRadius: 10,
    marginBottom: 8, marginHorizontal: 15, borderWidth: 1, borderColor: '#262626',
  },
  mineHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  mineLeague: { color: '#666', fontSize: 11 },
  minePointsBadge: {
    backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 6,
  },
  minePointsText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  mineTeams: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mineTeam: { flex: 1, color: '#fff', fontSize: 13 },
  mineTeamRight: { textAlign: 'right' },
  mineScoreBox: {
    backgroundColor: '#0a0a0a', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, borderColor: '#39FF1444',
  },
  mineScore: { color: '#39FF14', fontSize: 15, fontWeight: 'bold' },

  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 20, marginHorizontal: 15,
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#1c1c1c',
    borderWidth: 1, borderColor: '#FF336640',
  },
  leaveText: { color: '#FF3366', fontSize: 13, fontWeight: '600' },

  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000CC', justifyContent: 'center',
    alignItems: 'center', padding: 20,
  },
  modalSheet: {
    backgroundColor: '#111', borderRadius: 20, padding: 20,
    width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#333',
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
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  modalBtnCancel: { backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333' },
  modalBtnSave: { backgroundColor: '#39FF14' },
  modalBtnCancelText: { color: '#888', fontSize: 14, fontWeight: '600' },
  modalBtnSaveText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
});
