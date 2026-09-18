import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  subscribeRoomMembers, subscribeRoomPredictions,
  subscribeRoomSelectedMatches,
  RoomMember, RoomPrediction, SelectedMatch,
  fetchCurrentScores,
} from './roomService';
import { getUserKey } from './userService';
import TeamLogo from './TeamLogo';
import { formatBetLabel, getBetType } from './betTypes';
import LiveClock from './LiveClock';

interface Props {
  code: string;
  userEmail: string;
}

export default function RoomBets({ code, userEmail }: Props) {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [selectedMatches, setSelectedMatches] = useState<SelectedMatch[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Record<string, RoomPrediction>>>({});
  const [scores, setScores] = useState<Record<string, { homeScore: number; awayScore: number; status: string }>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const myKey = getUserKey(userEmail);

  useEffect(() => {
    const unsubM = subscribeRoomMembers(code, setMembers);
    const unsubSM = subscribeRoomSelectedMatches(code, setSelectedMatches);
    const unsubP = subscribeRoomPredictions(code, (preds) => {
      setPredictions(preds);
      setLoading(false);
    });
    fetchCurrentScores().then(setScores).catch(() => {});
    return () => {
      unsubM();
      unsubSM();
      unsubP();
    };
  }, [code]);

  // ⏱️ Auto-refresh des scores toutes les 30s s'il y a des matchs live
  useEffect(() => {
    const hasLive = Object.values(scores).some((s) => {
      const status = s.status;
      return status === 'HT' ||
        (!isNaN(parseInt(status, 10)) && parseInt(status, 10) > 0 && parseInt(status, 10) < 90);
    });
    if (!hasLive) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh scores RoomBets');
      fetchCurrentScores().then(setScores).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [scores]);

  const onRefresh = async () => {
    setRefreshing(true);
    const s = await fetchCurrentScores();
    setScores(s);
    setRefreshing(false);
  };

  const matchBets = useMemo(() => {
    return selectedMatches.map((sm) => {
      const bets: Array<{
        userKey: string;
        userName: string;
        pred: RoomPrediction;
        isMe: boolean;
      }> = [];

      Object.keys(predictions).forEach((userKey) => {
        const pred = predictions[userKey]?.[sm.matchId];
        if (pred) {
          const member = members.find((m) => m.userKey === userKey);
          bets.push({
            userKey,
            userName: member?.name || 'Joueur',
            pred,
            isMe: userKey === myKey,
          });
        }
      });

      bets.sort((a, b) => (b.pred.points || 0) - (a.pred.points || 0) || Number(b.isMe) - Number(a.isMe));

      return { selectedMatch: sm, bets };
    });
  }, [selectedMatches, predictions, members, myKey]);

  const totalBets = matchBets.reduce((sum, m) => sum + m.bets.length, 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#39FF14" />
      </View>
    );
  }

  if (selectedMatches.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="dice-outline" size={60} color="#333" />
        <Text style={styles.emptyText}>Aucun match dans le salon</Text>
        <Text style={styles.emptySubtext}>
          Le créateur doit d'abord ajouter des matchs
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#39FF14" />
      }
    >
      <Text style={styles.sectionTitle}>
        💰 {selectedMatches.length} match{selectedMatches.length > 1 ? 's' : ''} • {totalBets} pari{totalBets > 1 ? 's' : ''}
      </Text>

      {matchBets.map(({ selectedMatch: sm, bets }) => {
        const actual = scores[sm.matchId];
        const isFinished = actual && (actual.status === 'FT' || parseInt(actual.status, 10) >= 90);
        const isLive = actual && !isFinished && (actual.status === 'HT' || (parseInt(actual.status, 10) > 0 && parseInt(actual.status, 10) < 90));

        return (
          <View key={sm.matchId} style={styles.matchCard}>
            {/* Header */}
            <View style={styles.matchHeader}>
              <Text style={styles.leagueName}>{sm.matchInfo.leaguename}</Text>
              {isLive && <LiveClock status={actual.status} />}
              {isFinished && (
                <View style={styles.finishedBadge}>
                  <Text style={styles.finishedBadgeText}>✅ Terminé</Text>
                </View>
              )}
              {!isLive && !isFinished && (
                <View style={styles.upcomingBadge}>
                  <Text style={styles.upcomingBadgeText}>⏰ À venir</Text>
                </View>
              )}
            </View>

            {/* Équipes + score */}
            <View style={styles.teamsRow}>
              <View style={styles.teamBox}>
                <TeamLogo name={sm.matchInfo.localteam} size={28} />
                <Text style={styles.teamName} numberOfLines={1}>
                  {sm.matchInfo.localteam}
                </Text>
              </View>
              <View style={styles.scoreActual}>
                {actual ? (
                  <Text style={[styles.scoreActualText, isLive && { color: '#39FF14' }]}>
                    {actual.homeScore} - {actual.awayScore}
                  </Text>
                ) : (
                  <Text style={styles.scoreActualText}>- -</Text>
                )}
              </View>
              <View style={[styles.teamBox, { justifyContent: 'flex-end' }]}>
                <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>
                  {sm.matchInfo.visitorteam}
                </Text>
                <TeamLogo name={sm.matchInfo.visitorteam} size={28} />
              </View>
            </View>

            {/* Paris */}
            <View style={styles.betsList}>
              {bets.length === 0 ? (
                <Text style={styles.noBets}>Aucun pari pour ce match</Text>
              ) : (
                bets.map((b, i) => {
                  const bt = getBetType(b.pred.betType || 'exact_score');
                  const label = formatBetLabel({
                    type: b.pred.betType || 'exact_score',
                    value: b.pred.betValue,
                    homeScore: b.pred.homeScore,
                    awayScore: b.pred.awayScore,
                  });

                  return (
                    <View
                      key={i}
                      style={[styles.betRow, b.isMe && styles.betRowMe]}
                    >
                      <View style={styles.betAvatar}>
                        <Text style={styles.betAvatarText}>
                          {b.userName.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.betName} numberOfLines={1}>
                        {b.userName}{b.isMe ? ' (toi)' : ''}
                      </Text>
                      <View style={styles.betScoreBox}>
                        <Text style={styles.betScore} numberOfLines={1}>
                          {bt?.icon} {label}
                        </Text>
                      </View>
                      {isFinished && (
                        <View style={[
                          styles.betPointsBadge,
                          b.pred.points >= 5 && { backgroundColor: '#FFD70030', borderColor: '#FFD700' },
                          b.pred.points >= 1 && b.pred.points < 5 && { backgroundColor: '#39FF1430', borderColor: '#39FF14' },
                          b.pred.points === 0 && { backgroundColor: '#FF336620', borderColor: '#FF3366' },
                        ]}>
                          <Text style={[
                            styles.betPointsText,
                            b.pred.points >= 5 && { color: '#FFD700' },
                            b.pred.points >= 1 && b.pred.points < 5 && { color: '#39FF14' },
                            b.pred.points === 0 && { color: '#FF3366' },
                          ]}>
                            {b.pred.points} pts
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        );
      })}

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 30 },

  sectionTitle: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold',
    marginBottom: 12, paddingHorizontal: 15, letterSpacing: 0.5,
  },

  matchCard: {
    backgroundColor: '#171717', borderRadius: 12, padding: 12,
    marginBottom: 12, marginHorizontal: 15,
    borderWidth: 1, borderColor: '#262626',
  },
  matchHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  leagueName: { color: '#666', fontSize: 11, flex: 1 },
  finishedBadge: { backgroundColor: '#33333380', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  finishedBadgeText: { color: '#999', fontSize: 10, fontWeight: 'bold' },
  upcomingBadge: { backgroundColor: '#00BFFF20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  upcomingBadgeText: { color: '#00BFFF', fontSize: 10, fontWeight: 'bold' },

  teamsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  teamBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  teamName: { color: '#fff', fontSize: 12, fontWeight: '500', flex: 1 },
  scoreActual: {
    backgroundColor: '#0a0a0a', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#333',
  },
  scoreActualText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  betsList: { gap: 4 },
  noBets: { color: '#444', fontSize: 11, fontStyle: 'italic', textAlign: 'center', paddingVertical: 8 },

  betRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 8,
    backgroundColor: '#111', borderRadius: 8,
  },
  betRowMe: { backgroundColor: '#39FF1410', borderWidth: 1, borderColor: '#39FF1440' },
  betAvatar: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#262626',
    justifyContent: 'center', alignItems: 'center',
  },
  betAvatarText: { color: '#39FF14', fontSize: 10, fontWeight: 'bold' },
  betName: { color: '#ccc', fontSize: 11, flex: 1, maxWidth: 80 },
  betScoreBox: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'flex-end',
  },
  betScore: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  betPointsBadge: {
    paddingHorizontal: 6, paddingVertical: 3,
    borderRadius: 6, borderWidth: 1, borderColor: '#444',
    minWidth: 45, alignItems: 'center',
  },
  betPointsText: { fontSize: 10, fontWeight: 'bold' },
});
