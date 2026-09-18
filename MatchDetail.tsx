import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchMatchDetail } from './liveScoreService';
import TeamDetail from './TeamDetail';
import LiveClock from './LiveClock';

interface Props {
  visible: boolean;
  matchId: string | null;
  homeTeam: string;
  awayTeam: string;
  scoretime: string;
  status: string;
  league: string;
  onClose: () => void;
}

export default function MatchDetail({
  visible, matchId, homeTeam, awayTeam, scoretime, status, league, onClose,
}: Props) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'info' | 'events' | 'h2h'>('info');
  const [showTeamDetail, setShowTeamDetail] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('');

  const loadDetail = (silent = false) => {
    if (!matchId) return;
    if (!silent) setLoading(true);
    fetchMatchDetail(matchId)
      .then(setDetail)
      .catch((e) => console.error(e))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    if (visible && matchId) {
      loadDetail();
    }
  }, [visible, matchId]);

  // ⏱️ Auto-refresh toutes les 30s si match live
  useEffect(() => {
    if (!visible || !matchId) return;
    const isLive = status === 'HT' || status === 'LIVE' ||
      (!isNaN(parseInt(status, 10)) && parseInt(status, 10) > 0 && parseInt(status, 10) <= 90);

    if (!isLive) return;

    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh match live');
      loadDetail(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [visible, matchId, status]);

  const parts = scoretime?.split('-').map((s) => s.trim()) || ['-', '-'];
  const homeScore = parts[0] || '-';
  const awayScore = parts[1] || '-';

  const isLive = status === 'HT' || status === 'LIVE' ||
    (!isNaN(parseInt(status, 10)) && parseInt(status, 10) > 0 && parseInt(status, 10) <= 90);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.dragHandle} />
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#888" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
          >
            {/* League + Statut + Refresh */}
            <View style={styles.topInfo}>
              <Text style={styles.leagueText}>{league}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <LiveClock status={status} />
                <TouchableOpacity onPress={() => loadDetail()} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={14} color="#39FF14" />
                </TouchableOpacity>
              </View>
            </View>

            {/* SCORE PRINCIPAL */}
            <View style={styles.scoreBoard}>
              <TouchableOpacity
                style={styles.teamSide}
                onPress={() => {
                  setSelectedTeam(homeTeam);
                  setShowTeamDetail(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.crestBox}>
                  <Text style={styles.crestInitial}>
                    {homeTeam.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.teamFullName} numberOfLines={2}>
                  {homeTeam}
                </Text>
                <View style={styles.tapHintRow}>
                  <Ionicons name="information-circle-outline" size={10} color="#39FF14" />
                  <Text style={styles.tapHint}>Voir détails</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.scoreMiddle}>
                <View style={styles.scoreBigBox}>
                  <Text style={[styles.scoreBig, isLive && styles.scoreBigLive]}>
                    {homeScore}
                  </Text>
                  <Text style={styles.scoreDash}>-</Text>
                  <Text style={[styles.scoreBig, isLive && styles.scoreBigLive]}>
                    {awayScore}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.teamSide}
                onPress={() => {
                  setSelectedTeam(awayTeam);
                  setShowTeamDetail(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.crestBox}>
                  <Text style={styles.crestInitial}>
                    {awayTeam.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.teamFullName} numberOfLines={2}>
                  {awayTeam}
                </Text>
                <View style={styles.tapHintRow}>
                  <Ionicons name="information-circle-outline" size={10} color="#39FF14" />
                  <Text style={styles.tapHint}>Voir détails</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* TABS */}
            <View style={styles.tabsRow}>
              {[
                { key: 'info', label: '📊 Info' },
                { key: 'events', label: '⚽ Événements' },
                { key: 'h2h', label: '🔁 H2H' },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
                  onPress={() => setTab(t.key as any)}
                >
                  <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Contenu selon tab */}
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator color="#39FF14" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : !detail ? (
              <View style={styles.center}>
                <Ionicons name="warning-outline" size={40} color="#444" />
                <Text style={styles.emptyText}>Aucune donnée</Text>
              </View>
            ) : (
              <>
                {/* TAB INFO */}
                {tab === 'info' && (
                  <View style={styles.tabContent}>
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color="#39FF14" />
                        <Text style={styles.infoLabel}>Stade</Text>
                        <Text style={styles.infoValue}>{detail.venue || 'Non spécifié'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={16} color="#39FF14" />
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>{detail.date || '-'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={16} color="#39FF14" />
                        <Text style={styles.infoLabel}>Heure</Text>
                        <Text style={styles.infoValue}>{detail.time || '-'}</Text>
                      </View>
                      {detail.week && (
                        <View style={styles.infoRow}>
                          <Ionicons name="flag-outline" size={16} color="#39FF14" />
                          <Text style={styles.infoLabel}>Journée</Text>
                          <Text style={styles.infoValue}>J{detail.week}</Text>
                        </View>
                      )}
                      {detail.season && (
                        <View style={styles.infoRow}>
                          <Ionicons name="trophy-outline" size={16} color="#39FF14" />
                          <Text style={styles.infoLabel}>Saison</Text>
                          <Text style={styles.infoValue}>{detail.season}</Text>
                        </View>
                      )}
                    </View>

                    {detail.stats && (
                      <View style={styles.statsCard}>
                        <Text style={styles.sectionTitle}>📊 Statistiques</Text>
                        {detail.stats.total_localteam_won !== undefined && (
                          <StatRow label="Victoires domicile" value={detail.stats.total_localteam_won} color="#39FF14" />
                        )}
                        {detail.stats.total_visitorteam_won !== undefined && (
                          <StatRow label="Victoires extérieur" value={detail.stats.total_visitorteam_won} color="#00BFFF" />
                        )}
                        {detail.stats.total_draws !== undefined && (
                          <StatRow label="Matchs nuls" value={detail.stats.total_draws} color="#888" />
                        )}
                        {detail.stats.total_localteam_scored !== undefined && (
                          <StatRow label="Buts domicile" value={detail.stats.total_localteam_scored} color="#FFD700" />
                        )}
                        {detail.stats.total_visitorteam_scored !== undefined && (
                          <StatRow label="Buts extérieur" value={detail.stats.total_visitorteam_scored} color="#FF6B6B" />
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* TAB EVENTS */}
                {tab === 'events' && (
                  <View style={styles.tabContent}>
                    {detail.events && detail.events.length > 0 ? (
                      <View style={styles.timeline}>
                        {detail.events.map((ev: any, i: number) => {
                          const type = ev.type || ev.event || '';
                          const isGoal = /goal/i.test(type);
                          const isYellow = /yellow/i.test(type);
                          const isRed = /red/i.test(type);
                          const isSub = /subst/i.test(type);

                          return (
                            <View key={i} style={styles.eventItem}>
                              <View style={styles.eventMinuteBox}>
                                <Text style={styles.eventMinute}>
                                  {ev.minute || '?'}'
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.eventIcon,
                                  isGoal && { backgroundColor: '#39FF1420', borderColor: '#39FF14' },
                                  isYellow && { backgroundColor: '#FFD70020', borderColor: '#FFD700' },
                                  isRed && { backgroundColor: '#FF336620', borderColor: '#FF3366' },
                                  isSub && { backgroundColor: '#00BFFF20', borderColor: '#00BFFF' },
                                ]}
                              >
                                <Ionicons
                                  name={
                                    isGoal ? 'football' :
                                    isYellow || isRed ? 'square' :
                                    isSub ? 'swap-horizontal' : 'ellipse'
                                  }
                                  size={14}
                                  color={
                                    isGoal ? '#39FF14' :
                                    isYellow ? '#FFD700' :
                                    isRed ? '#FF3366' :
                                    isSub ? '#00BFFF' : '#888'
                                  }
                                />
                              </View>
                              <View style={styles.eventDetails}>
                                <Text style={styles.eventPlayer}>
                                  {ev.player || ev.player_name || ev.description || type}
                                </Text>
                                {ev.team && (
                                  <Text style={styles.eventTeam}>
                                    {ev.team === 'home' ? homeTeam : awayTeam}
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={styles.center}>
                        <Ionicons name="time-outline" size={50} color="#333" />
                        <Text style={styles.emptyText}>Pas d'événements</Text>
                        <Text style={styles.emptySubtext}>
                          Les buts et cartons apparaîtront ici
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* TAB H2H */}
                {tab === 'h2h' && (
                  <View style={styles.tabContent}>
                    {detail.h2hMatches && detail.h2hMatches.length > 0 ? (
                      <>
                        <Text style={styles.sectionTitle}>🔁 Derniers face-à-face</Text>
                        {detail.h2hMatches.map((h: any, i: number) => {
                          const hParts = h.scoretime?.split('-').map((s: string) => s.trim()) || ['-', '-'];
                          const homeWon = parseInt(hParts[0], 10) > parseInt(hParts[1], 10);
                          const awayWon = parseInt(hParts[1], 10) > parseInt(hParts[0], 10);

                          return (
                            <View key={i} style={styles.h2hCard}>
                              <Text style={styles.h2hDate}>{h.date}</Text>
                              <View style={styles.h2hRow}>
                                <Text
                                  style={[styles.h2hTeam, homeWon && styles.h2hWinner]}
                                  numberOfLines={1}
                                >
                                  {h.localteam}
                                </Text>
                                <View style={styles.h2hScoreBox}>
                                  <Text style={styles.h2hScore}>
                                    {hParts[0]} - {hParts[1]}
                                  </Text>
                                </View>
                                <Text
                                  style={[styles.h2hTeam, styles.h2hTeamRight, awayWon && styles.h2hWinner]}
                                  numberOfLines={1}
                                >
                                  {h.visitorteam}
                                </Text>
                              </View>
                              <Text style={styles.h2hLeague} numberOfLines={1}>
                                {h.leaguename}
                              </Text>
                            </View>
                          );
                        })}
                      </>
                    ) : (
                      <View style={styles.center}>
                        <Ionicons name="repeat-outline" size={50} color="#333" />
                        <Text style={styles.emptyText}>Pas de H2H</Text>
                      </View>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>

      <TeamDetail
        visible={showTeamDetail}
        teamName={selectedTeam}
        onClose={() => setShowTeamDetail(false)}
      />
    </Modal>
  );
}

function StatRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0f0f0f',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: '92%',
    minHeight: 500,
    borderTopWidth: 1,
    borderColor: '#222',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dragHandle: {
    width: 40, height: 4, backgroundColor: '#333',
    borderRadius: 2, position: 'absolute',
    left: '50%', marginLeft: -20, top: 0,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 'auto',
  },

  topInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    gap: 8,
  },
  leagueText: {
    color: '#666', fontSize: 12, fontStyle: 'italic', flex: 1,
  },
  refreshBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#262626',
  },

  scoreBoard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  teamSide: { flex: 1, alignItems: 'center', gap: 8 },
  crestBox: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#1a1a1a',
    borderWidth: 2, borderColor: '#39FF1440',
    justifyContent: 'center', alignItems: 'center',
  },
  crestInitial: { color: '#39FF14', fontSize: 22, fontWeight: 'bold' },
  teamFullName: {
    color: '#fff', fontSize: 12, textAlign: 'center', fontWeight: '600',
  },
  tapHintRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  tapHint: { color: '#39FF14', fontSize: 9, opacity: 0.8 },

  scoreMiddle: { alignItems: 'center' },
  scoreBigBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 2, borderColor: '#39FF1430',
    gap: 8,
  },
  scoreBig: {
    color: '#fff', fontSize: 32, fontWeight: 'bold',
    minWidth: 30, textAlign: 'center',
  },
  scoreBigLive: { color: '#39FF14' },
  scoreDash: { color: '#555', fontSize: 24 },

  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: '#262626',
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  tabText: { color: '#888', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#000' },

  tabContent: { gap: 12 },
  center: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 15, marginTop: 12, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 12, marginTop: 4, textAlign: 'center' },

  sectionTitle: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold',
    marginBottom: 10, letterSpacing: 0.5,
  },

  infoCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14,
    padding: 14, gap: 12, borderWidth: 1, borderColor: '#262626',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { color: '#888', fontSize: 12, flex: 1 },
  infoValue: {
    color: '#fff', fontSize: 12, fontWeight: '600',
    maxWidth: '55%', textAlign: 'right',
  },

  statsCard: {
    backgroundColor: '#1a1a1a', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#262626',
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#222',
  },
  statLabel: { color: '#ccc', fontSize: 13 },
  statValue: { fontSize: 16, fontWeight: 'bold' },

  timeline: { gap: 8 },
  eventItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1a1a1a', padding: 12, borderRadius: 12,
    borderWidth: 1, borderColor: '#262626',
  },
  eventMinuteBox: { width: 42, alignItems: 'center' },
  eventMinute: { color: '#39FF14', fontSize: 13, fontWeight: 'bold' },
  eventIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  eventDetails: { flex: 1 },
  eventPlayer: { color: '#fff', fontSize: 13, fontWeight: '500' },
  eventTeam: { color: '#666', fontSize: 11, marginTop: 2 },

  h2hCard: {
    backgroundColor: '#1a1a1a', borderRadius: 12,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: '#262626',
  },
  h2hDate: { color: '#666', fontSize: 10, marginBottom: 8, textAlign: 'center' },
  h2hRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  h2hTeam: { flex: 1, color: '#aaa', fontSize: 12 },
  h2hTeamRight: { textAlign: 'right' },
  h2hWinner: { color: '#39FF14', fontWeight: 'bold' },
  h2hScoreBox: {
    backgroundColor: '#000',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, borderWidth: 1, borderColor: '#39FF1430',
  },
  h2hScore: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  h2hLeague: {
    color: '#444', fontSize: 10, textAlign: 'center',
    marginTop: 8, fontStyle: 'italic',
  },
});
