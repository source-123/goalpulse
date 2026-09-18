import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Share, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  subscribeRoomMembers, subscribeRoomPredictions,
  subscribeRoomSelectedMatches, saveRoomPrediction,
  addMatchToRoom, removeMatchFromRoom, leaveRoom,
  deleteUserPrediction,
  RoomMember, RoomPrediction, SelectedMatch,
  computeRoomLeaderboard,
} from './roomService';
import { getUserKey } from './userService';
import {
  fetchLiveScores, CountryGroup, RawMatch, formatTime,
} from './liveScoreService';
import TeamLogo from './TeamLogo';
import RoomBets from './RoomBets';

interface Props {
  code: string;
  name: string;
  userEmail: string;
  onClose: () => void;
}

type Tab = 'matches' | 'bets' | 'leaderboard';
type PickerFilter = 'all' | 'live' | 'upcoming' | 'finished';

// 🔍 Type de statut
const getMatchType = (status: string): 'live' | 'upcoming' | 'finished' => {
  if (!status) return 'upcoming';
  if (status === 'HT' || status === 'LIVE') return 'live';
  if (status === 'FT') return 'finished';
  const num = parseInt(status, 10);
  if (!isNaN(num)) {
    if (num >= 90) return 'finished';
    if (num > 0 && num < 90) return 'live';
  }
  return 'upcoming';
};

export default function RoomDetail({ code, name, userEmail, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('matches');
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<SelectedMatch[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, RoomPrediction>>>({});
  const [allGroups, setAllGroups] = useState<CountryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerFilter, setPickerFilter] = useState<PickerFilter>('live');
  const [selectedMatch, setSelectedMatch] = useState<SelectedMatch | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');

  const myKey = getUserKey(userEmail);

  useEffect(() => {
    fetchLiveScores().then(setAllGroups).catch(() => {}).finally(() => setLoading(false));
    const unsubM = subscribeRoomMembers(code, setMembers);
    const unsubSM = subscribeRoomSelectedMatches(code, setSelectedMatches);
    const unsubP = subscribeRoomPredictions(code, setPredictions);
    return () => {
      unsubM();
      unsubSM();
      unsubP();
    };
  }, [code]);

  const isCreator = useMemo(() => {
    if (members.length === 0) return false;
    const sorted = [...members].sort((a, b) => a.joinedAt - b.joinedAt);
    return sorted[0]?.userKey === myKey;
  }, [members, myKey]);

  const myPreds = useMemo(() => predictions[myKey] || {}, [predictions, myKey]);

  const leaderboard = useMemo(
    () => computeRoomLeaderboard(members, predictions),
    [members, predictions]
  );

  // ⭐ Tous les matchs non encore ajoutés, filtrés selon pickerFilter
  const availableMatches = useMemo(() => {
    const all: RawMatch[] = [];
    allGroups.forEach((c) => {
      c.leagues.forEach((l) => {
        l.matches.forEach((m) => {
          if (!selectedMatches.find((sm) => sm.matchId === m.id)) {
            all.push({ ...m, country: c.country });
          }
        });
      });
    });

    // Filtrer selon le tab du picker
    const filtered = pickerFilter === 'all'
      ? all
      : all.filter((m) => getMatchType(m.status) === pickerFilter);

    // Trier : live en premier, puis upcoming, puis finished
    const order = { live: 0, upcoming: 1, finished: 2 };
    return filtered.sort((a, b) => {
      const oa = order[getMatchType(a.status)];
      const ob = order[getMatchType(b.status)];
      if (oa !== ob) return oa - ob;
      return (a.time || '').localeCompare(b.time || '');
    });
  }, [allGroups, selectedMatches, pickerFilter]);

  // Compteurs
  const counts = useMemo(() => {
    const all: RawMatch[] = [];
    allGroups.forEach((c) => c.leagues.forEach((l) => l.matches.forEach((m) => {
      if (!selectedMatches.find((sm) => sm.matchId === m.id)) all.push(m);
    })));
    return {
      all: all.length,
      live: all.filter((m) => getMatchType(m.status) === 'live').length,
      upcoming: all.filter((m) => getMatchType(m.status) === 'upcoming').length,
      finished: all.filter((m) => getMatchType(m.status) === 'finished').length,
    };
  }, [allGroups, selectedMatches]);

  // Grouper par pays pour l'affichage
  const groupedAvailable = useMemo(() => {
    const map: Record<string, RawMatch[]> = {};
    availableMatches.forEach((m) => {
      const c = m.country || 'Autre';
      if (!map[c]) map[c] = [];
      map[c].push(m);
    });
    return map;
  }, [availableMatches]);

  const handleAddMatch = async (match: RawMatch) => {
    try {
      await addMatchToRoom(code, userEmail, match.id, {
        localteam: match.localteam,
        visitorteam: match.visitorteam,
        leaguename: match.leaguename,
        date: match.date,
        time: match.time,
        status: match.status,
        scoretime: match.scoretime,
      });
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleRemoveMatch = (sm: SelectedMatch) => {
    Alert.alert(
      'Retirer',
      `Retirer "${sm.matchInfo.localteam} vs ${sm.matchInfo.visitorteam}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => removeMatchFromRoom(code, sm.matchId),
        },
      ]
    );
  };

  const openBet = (sm: SelectedMatch) => {
    setSelectedMatch(sm);
    const existing = myPreds[sm.matchId];
    if (existing) {
      setHomeScore(String(existing.homeScore));
      setAwayScore(String(existing.awayScore));
    } else {
      setHomeScore('');
      setAwayScore('');
    }
  };

  const handleSaveBet = async () => {
    if (!selectedMatch) return;
    const h = parseInt(homeScore, 10);
    const a = parseInt(awayScore, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      Alert.alert('Erreur', 'Score invalide');
      return;
    }
    try {
      await saveRoomPrediction(code, userEmail, selectedMatch.matchId, h, a, selectedMatch.matchInfo);
      Alert.alert('✅ Pari enregistré', `${h} - ${a}`);
      setSelectedMatch(null);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const handleDeleteBet = () => {
    if (!selectedMatch) return;
    Alert.alert('Supprimer', 'Annuler ton pari ?', [
      { text: 'Non', style: 'cancel' },
      {
        text: 'Oui',
        style: 'destructive',
        onPress: async () => {
          await deleteUserPrediction(code, userEmail, selectedMatch.matchId);
          setSelectedMatch(null);
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `🎮 Rejoins mon salon GoalPulse "${name}" !\n\nCode : ${code}\n\nTélécharge l'app et entre ce code.`,
      });
    } catch {}
  };

  const handleLeave = () => {
    Alert.alert('Quitter', `Quitter "${name}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Quitter',
        style: 'destructive',
        onPress: async () => {
          await leaveRoom(code, userEmail);
          onClose();
        },
      },
    ]);
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
        <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>{name}</Text>
          <Text style={styles.headerCode}>
            {code} • {members.length} joueur{members.length > 1 ? 's' : ''}{isCreator ? ' • 👑' : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare} style={[styles.iconBtn, { borderColor: '#39FF14' }]}>
          <Ionicons name="share-social" size={20} color="#39FF14" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {[
          { key: 'matches', label: '🎯 Matchs' },
          { key: 'bets', label: '💰 Paris' },
          { key: 'leaderboard', label: '🏆 Classement' },
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
        {tab === 'matches' && (
          <>
            {isCreator && (
              <TouchableOpacity
                style={styles.addMatchBtn}
                onPress={() => setShowPicker(true)}
              >
                <Ionicons name="add-circle" size={22} color="#000" />
                <Text style={styles.addMatchText}>Ajouter des matchs</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>
              ⭐ {selectedMatches.length} match{selectedMatches.length > 1 ? 's' : ''} du salon
            </Text>

            {selectedMatches.length === 0 ? (
              <View style={styles.center}>
                <Ionicons name="list-outline" size={60} color="#333" />
                <Text style={styles.emptyText}>
                  {isCreator ? 'Aucun match ajouté' : 'En attente du créateur'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {isCreator
                    ? 'Clique sur "Ajouter des matchs"'
                    : 'Le créateur va ajouter des matchs'}
                </Text>
              </View>
            ) : (
              selectedMatches.map((sm) => {
                const hasBet = !!myPreds[sm.matchId];
                const type = getMatchType(sm.matchInfo.status);
                return (
                  <View key={sm.matchId} style={styles.matchCard}>
                    <View style={styles.matchHeader}>
                      <Text style={styles.leagueName}>{sm.matchInfo.leaguename}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {type === 'live' && (
                          <View style={styles.liveBadge}>
                            <Text style={styles.liveBadgeText}>
                              🔴 {sm.matchInfo.status}'
                            </Text>
                          </View>
                        )}
                        {type === 'finished' && (
                          <View style={styles.finishedBadge}>
                            <Text style={styles.finishedBadgeText}>✅ Terminé</Text>
                          </View>
                        )}
                        {isCreator && (
                          <TouchableOpacity
                            onPress={() => handleRemoveMatch(sm)}
                            style={styles.actionIconBtn}
                          >
                            <Ionicons name="trash-outline" size={14} color="#FF3366" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={styles.matchTeams}>
                      <View style={styles.matchTeamRow}>
                        <TeamLogo name={sm.matchInfo.localteam} size={28} />
                        <Text style={styles.matchTeamName} numberOfLines={1}>
                          {sm.matchInfo.localteam}
                        </Text>
                      </View>
                      <View style={styles.vsBox}>
                        <Text style={styles.vsTime}>{formatTime(sm.matchInfo.time)}</Text>
                        <Text style={styles.vsText}>VS</Text>
                      </View>
                      <View style={[styles.matchTeamRow, { justifyContent: 'flex-end' }]}>
                        <Text style={[styles.matchTeamName, { textAlign: 'right' }]} numberOfLines={1}>
                          {sm.matchInfo.visitorteam}
                        </Text>
                        <TeamLogo name={sm.matchInfo.visitorteam} size={28} />
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.betBtn, hasBet && styles.betBtnDone]}
                      onPress={() => openBet(sm)}
                    >
                      {hasBet ? (
                        <>
                          <Ionicons name="checkmark-circle" size={18} color="#39FF14" />
                          <Text style={[styles.betBtnText, { color: '#39FF14' }]}>
                            Ton pari : {myPreds[sm.matchId].homeScore} - {myPreds[sm.matchId].awayScore}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="create-outline" size={18} color="#000" />
                          <Text style={styles.betBtnText}>Parier</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}
          </>
        )}

        {tab === 'bets' && <RoomBets code={code} userEmail={userEmail} />}

        {tab === 'leaderboard' && (
          <>
            <Text style={styles.sectionTitle}>
              🏆 Classement ({members.length} joueur{members.length > 1 ? 's' : ''})
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
                    <View style={[
                      styles.lbRank,
                      i === 0 && { backgroundColor: '#FFD70020', borderColor: '#FFD700' },
                      i === 1 && { backgroundColor: '#C0C0C020', borderColor: '#C0C0C0' },
                      i === 2 && { backgroundColor: '#CD7F3220', borderColor: '#CD7F32' },
                    ]}>
                      <Text style={styles.lbRankText}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </Text>
                    </View>
                    <View style={styles.lbInfo}>
                      <Text style={styles.lbName} numberOfLines={1}>
                        {m.name}{isMe ? ' (toi)' : ''}
                      </Text>
                      <Text style={styles.lbMeta}>
                        {m.totalPreds} pari{m.totalPreds > 1 ? 's' : ''} • {m.exactCount} exact
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

        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeave}>
          <Ionicons name="exit-outline" size={16} color="#FF3366" />
          <Text style={styles.leaveText}>Quitter le salon</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ⭐ Picker amélioré */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choisir un match</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={26} color="#888" />
              </TouchableOpacity>
            </View>

            {/* Filtres du picker */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.pickerFiltersScroll}
              contentContainerStyle={styles.pickerFiltersRow}
            >
              {[
                { key: 'live', label: `🔴 Live (${counts.live})` },
                { key: 'upcoming', label: `⏰ À venir (${counts.upcoming})` },
                { key: 'finished', label: `✅ Terminés (${counts.finished})` },
                { key: 'all', label: `📋 Tous (${counts.all})` },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.pickerFilterBtn,
                    pickerFilter === f.key && styles.pickerFilterBtnActive,
                  ]}
                  onPress={() => setPickerFilter(f.key as PickerFilter)}
                >
                  <Text
                    style={[
                      styles.pickerFilterText,
                      pickerFilter === f.key && styles.pickerFilterTextActive,
                    ]}
                  >
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Liste des matchs */}
            <ScrollView style={{ flex: 1 }}>
              {availableMatches.length === 0 ? (
                <View style={styles.center}>
                  <Ionicons name="football-outline" size={60} color="#333" />
                  <Text style={styles.emptyText}>
                    {pickerFilter === 'live'
                      ? 'Aucun match en direct'
                      : pickerFilter === 'upcoming'
                      ? 'Aucun match à venir'
                      : pickerFilter === 'finished'
                      ? 'Aucun match terminé'
                      : 'Aucun match disponible'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    Change de filtre pour voir d'autres matchs
                  </Text>
                </View>
              ) : (
                Object.keys(groupedAvailable).map((country) => (
                  <View key={country} style={styles.countryBox}>
                    <View style={styles.countryHeader}>
                      <Ionicons name="globe-outline" size={12} color="#666" />
                      <Text style={styles.countryTitle}>{country}</Text>
                    </View>
                    {groupedAvailable[country].map((m, i) => {
                      const type = getMatchType(m.status);
                      const parts = m.scoretime?.split('-').map((s) => s.trim()) || ['-', '-'];

                      return (
                        <TouchableOpacity
                          key={i}
                          style={styles.pickMatchRow}
                          onPress={() => handleAddMatch(m)}
                          activeOpacity={0.7}
                        >
                          {/* Indicateur statut */}
                          <View style={styles.pickStatusCol}>
                            {type === 'live' && (
                              <>
                                <View style={styles.pickLiveDot} />
                                <Text style={styles.pickLiveText}>{m.status}'</Text>
                              </>
                            )}
                            {type === 'upcoming' && (
                              <>
                                <Ionicons name="time-outline" size={14} color="#00BFFF" />
                                <Text style={styles.pickUpcomingText}>
                                  {formatTime(m.time)}
                                </Text>
                              </>
                            )}
                            {type === 'finished' && (
                              <>
                                <Ionicons name="checkmark-circle" size={14} color="#666" />
                                <Text style={styles.pickFinishedText}>FT</Text>
                              </>
                            )}
                          </View>

                          {/* Équipes */}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.pickTeam} numberOfLines={1}>
                              {m.localteam}
                            </Text>
                            <Text style={styles.pickTeam} numberOfLines={1}>
                              {m.visitorteam}
                            </Text>
                          </View>

                          {/* Score si live ou fini */}
                          {(type === 'live' || type === 'finished') && (
                            <View style={styles.pickScoreBox}>
                              <Text
                                style={[
                                  styles.pickScoreText,
                                  type === 'live' && { color: '#39FF14' },
                                ]}
                              >
                                {parts[0]} - {parts[1]}
                              </Text>
                            </View>
                          )}

                          <Ionicons name="add-circle" size={24} color="#39FF14" />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal pari */}
      {selectedMatch && (
        <View style={styles.betOverlay}>
          <View style={styles.betSheet}>
            <Text style={styles.betTitle}>Ton pari</Text>
            <Text style={styles.betLeague}>{selectedMatch.matchInfo.leaguename}</Text>

            <View style={styles.betTeamsRow}>
              <View style={styles.betTeamCol}>
                <TeamLogo name={selectedMatch.matchInfo.localteam} size={44} />
                <Text style={styles.betTeamName} numberOfLines={2}>
                  {selectedMatch.matchInfo.localteam}
                </Text>
              </View>
              <View style={styles.betScoreCol}>
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
              <View style={styles.betTeamCol}>
                <TeamLogo name={selectedMatch.matchInfo.visitorteam} size={44} />
                <Text style={styles.betTeamName} numberOfLines={2}>
                  {selectedMatch.matchInfo.visitorteam}
                </Text>
              </View>
            </View>

            <Text style={styles.pointsInfo}>
              🎯 Score exact : <Text style={styles.pointsHi}>5 pts</Text>
              {'\n'}✌️ Bon écart : <Text style={styles.pointsHi}>3 pts</Text>
              {'\n'}✅ Bon vainqueur : <Text style={styles.pointsHi}>1 pt</Text>
            </Text>

            <View style={styles.betActions}>
              {myPreds[selectedMatch.matchId] && (
                <TouchableOpacity
                  style={[styles.betBtn2, { backgroundColor: '#FF336620', borderWidth: 1, borderColor: '#FF3366' }]}
                  onPress={handleDeleteBet}
                >
                  <Ionicons name="trash" size={18} color="#FF3366" />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.betBtn2, { backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333' }]}
                onPress={() => setSelectedMatch(null)}
              >
                <Text style={{ color: '#888', fontWeight: '600' }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.betBtn2, { backgroundColor: '#39FF14', flex: 2 }]}
                onPress={handleSaveBet}
              >
                <Ionicons name="checkmark" size={20} color="#000" />
                <Text style={{ color: '#000', fontWeight: 'bold' }}>Valider</Text>
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
  emptySubtext: { color: '#444', fontSize: 12, marginTop: 5, textAlign: 'center', paddingHorizontal: 30 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 15, marginBottom: 12,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#1c1c1c',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  headerTitleBox: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  headerCode: { color: '#39FF14', fontSize: 11, fontWeight: 'bold', letterSpacing: 0.5, marginTop: 2 },

  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 12, paddingHorizontal: 15 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  tabText: { color: '#888', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#000' },

  addMatchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#39FF14', paddingVertical: 14, borderRadius: 12,
    marginHorizontal: 15, marginBottom: 15,
  },
  addMatchText: { color: '#000', fontWeight: 'bold', fontSize: 14 },

  sectionTitle: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold',
    marginBottom: 10, paddingHorizontal: 15, letterSpacing: 0.5,
  },

  matchCard: {
    backgroundColor: '#171717', borderRadius: 12, padding: 12,
    marginBottom: 10, marginHorizontal: 15,
    borderWidth: 1, borderColor: '#262626',
  },
  matchHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  leagueName: { color: '#666', fontSize: 11, flex: 1 },
  liveBadge: {
    backgroundColor: '#39FF1425', paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6,
  },
  liveBadgeText: { color: '#39FF14', fontSize: 9, fontWeight: 'bold' },
  finishedBadge: {
    backgroundColor: '#33333380', paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6,
  },
  finishedBadgeText: { color: '#999', fontSize: 9, fontWeight: 'bold' },
  actionIconBtn: {
    width: 26, height: 26, borderRadius: 6,
    backgroundColor: '#FF336615',
    justifyContent: 'center', alignItems: 'center',
  },

  matchTeams: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  matchTeamRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  matchTeamName: { flex: 1, color: '#fff', fontSize: 12, fontWeight: '500' },
  vsBox: { alignItems: 'center', paddingHorizontal: 6 },
  vsTime: { color: '#39FF14', fontSize: 11, fontWeight: 'bold' },
  vsText: { color: '#555', fontSize: 9, marginTop: 1 },

  betBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#39FF14', paddingVertical: 10, borderRadius: 10,
  },
  betBtnDone: { backgroundColor: '#39FF1415', borderWidth: 1, borderColor: '#39FF14' },
  betBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },

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
  lbRankText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  lbInfo: { flex: 1 },
  lbName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  lbMeta: { color: '#666', fontSize: 11, marginTop: 2 },
  lbPoints: { alignItems: 'flex-end' },
  lbPointsText: { color: '#39FF14', fontSize: 20, fontWeight: 'bold' },
  lbPointsLabel: { color: '#666', fontSize: 9, fontWeight: '600' },

  leaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, marginTop: 20, marginHorizontal: 15,
    paddingVertical: 12, borderRadius: 10,
    backgroundColor: '#1c1c1c',
    borderWidth: 1, borderColor: '#FF336640',
  },
  leaveText: { color: '#FF3366', fontSize: 13, fontWeight: '600' },

  pickerOverlay: {
    flex: 1, backgroundColor: '#000000CC',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#111', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, height: '90%',
    borderTopWidth: 1, borderColor: '#333',
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  pickerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  pickerFiltersScroll: { maxHeight: 45, marginBottom: 15 },
  pickerFiltersRow: { gap: 8, paddingRight: 10 },
  pickerFilterBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
  },
  pickerFilterBtnActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  pickerFilterText: { color: '#888', fontSize: 12, fontWeight: '600' },
  pickerFilterTextActive: { color: '#000' },

  countryBox: { marginBottom: 15 },
  countryHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  countryTitle: {
    color: '#aaa', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1, textTransform: 'uppercase',
  },

  pickMatchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a1a1a', padding: 10, borderRadius: 10,
    marginBottom: 6, borderWidth: 1, borderColor: '#262626',
  },
  pickStatusCol: {
    width: 40, alignItems: 'center', gap: 2,
  },
  pickLiveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#39FF14',
  },
  pickLiveText: { color: '#39FF14', fontSize: 9, fontWeight: 'bold' },
  pickUpcomingText: { color: '#00BFFF', fontSize: 9, fontWeight: 'bold' },
  pickFinishedText: { color: '#666', fontSize: 9, fontWeight: 'bold' },
  pickTeam: { color: '#fff', fontSize: 12 },
  pickScoreBox: {
    backgroundColor: '#0a0a0a', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6, minWidth: 45, alignItems: 'center',
  },
  pickScoreText: { color: '#999', fontSize: 12, fontWeight: 'bold' },

  betOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#000000CC', justifyContent: 'center',
    alignItems: 'center', padding: 20,
  },
  betSheet: {
    backgroundColor: '#111', borderRadius: 20, padding: 20,
    width: '100%', maxWidth: 400, borderWidth: 1, borderColor: '#333',
  },
  betTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  betLeague: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  betTeamsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  betTeamCol: { flex: 1, alignItems: 'center', gap: 6 },
  betTeamName: { color: '#fff', fontSize: 12, textAlign: 'center' },
  betScoreCol: { alignItems: 'center' },
  scoreInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreInput: {
    width: 50, height: 60, backgroundColor: '#0a0a0a',
    borderWidth: 2, borderColor: '#39FF14', borderRadius: 12,
    color: '#39FF14', fontSize: 26, fontWeight: 'bold',
    textAlign: 'center',
  },
  scoreDash: { color: '#555', fontSize: 22, fontWeight: 'bold' },
  pointsInfo: {
    color: '#666', fontSize: 11, textAlign: 'center',
    lineHeight: 18, marginBottom: 15,
  },
  pointsHi: { color: '#39FF14', fontWeight: 'bold' },
  betActions: { flexDirection: 'row', gap: 10 },
  betBtn2: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
});
