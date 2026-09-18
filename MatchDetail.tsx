import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TeamLogo from './TeamLogo';
import { fetchMatchDetail } from './liveScoreService';

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

  useEffect(() => {
    if (visible && matchId) {
      setLoading(true);
      fetchMatchDetail(matchId)
        .then(setDetail)
        .catch((e) => Alert.alert('Erreur', e.message))
        .finally(() => setLoading(false));
    } else {
      setDetail(null);
    }
  }, [visible, matchId]);

  const parts = scoretime?.split('-').map((s) => s.trim()) || ['-', '-'];

  const renderEvent = (ev: any, i: number, homeTeam: string, awayTeam: string) => {
    const type = ev.type || ev.event || '';
    const isGoal = /goal/i.test(type);
    const isYellow = /yellow/i.test(type);
    const isRed = /red/i.test(type);

    return (
      <View key={i} style={styles.eventRow}>
        <Text style={styles.eventMinute}>
          {ev.minute || ev.time || '?'}'
        </Text>
        <View
          style={[
            styles.eventIconBox,
            isGoal && { backgroundColor: '#39FF1422' },
            isYellow && { backgroundColor: '#FFD70022' },
            isRed && { backgroundColor: '#FF336622' },
          ]}
        >
          <Ionicons
            name={isGoal ? 'football' : isYellow || isRed ? 'square' : 'ellipse'}
            size={14}
            color={isGoal ? '#39FF14' : isYellow ? '#FFD700' : isRed ? '#FF3366' : '#888'}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventPlayer} numberOfLines={1}>
            {ev.player || ev.player_name || ev.description || 'Événement'}
          </Text>
          {ev.team && (
            <Text style={styles.eventTeamSmall}>
              {ev.team === 'home' ? homeTeam : awayTeam}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Détail du match</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={26} color="#888" />
            </TouchableOpacity>
          </View>

          {/* Score principal */}
          <View style={styles.scoreBox}>
            <View style={styles.teamCol}>
              <TeamLogo name={homeTeam} size={52} />
              <Text style={styles.teamName} numberOfLines={2}>{homeTeam}</Text>
            </View>

            <View style={styles.scoreCol}>
              <Text style={styles.bigScore}>
                {parts[0]} - {parts[1]}
              </Text>
              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{status}</Text>
              </View>
            </View>

            <View style={styles.teamCol}>
              <TeamLogo name={awayTeam} size={52} />
              <Text style={styles.teamName} numberOfLines={2}>{awayTeam}</Text>
            </View>
          </View>

          <Text style={styles.leagueText}>{league}</Text>

          {/* Info : stade, date, semaine */}
          {detail && (
            <View style={styles.infoRow}>
              {detail.venue && (
                <View style={styles.infoItem}>
                  <Ionicons name="location-outline" size={12} color="#666" />
                  <Text style={styles.infoText} numberOfLines={1}>{detail.venue}</Text>
                </View>
              )}
              {detail.date && (
                <View style={styles.infoItem}>
                  <Ionicons name="calendar-outline" size={12} color="#666" />
                  <Text style={styles.infoText}>{detail.date}</Text>
                </View>
              )}
              {detail.week && (
                <View style={styles.infoItem}>
                  <Ionicons name="flag-outline" size={12} color="#666" />
                  <Text style={styles.infoText}>J{detail.week}</Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {/* Contenu */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#39FF14" />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          ) : detail ? (
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>

              {/* ⚽ ÉVÉNEMENTS */}
              {detail.events && detail.events.length > 0 ? (
                <>
                  <Text style={styles.sectionTitle}>⚽ Événements</Text>
                  {detail.events.map((ev: any, i: number) =>
                    renderEvent(ev, i, homeTeam, awayTeam)
                  )}
                </>
              ) : (
                <View style={styles.noEvents}>
                  <Ionicons name="time-outline" size={22} color="#444" />
                  <Text style={styles.noEventsText}>
                    Pas d'événements disponibles
                  </Text>
                </View>
              )}

              {/* 📊 STATS */}
              {detail.stats && (
                <>
                  <Text style={styles.sectionTitle}>📊 Statistiques</Text>
                  <View style={styles.statsBox}>
                    {detail.stats.total_localteam_won !== undefined && (
                      <StatRow
                        label="Victoires domicile"
                        value={detail.stats.total_localteam_won}
                      />
                    )}
                    {detail.stats.total_visitorteam_won !== undefined && (
                      <StatRow
                        label="Victoires extérieur"
                        value={detail.stats.total_visitorteam_won}
                      />
                    )}
                    {detail.stats.total_draws !== undefined && (
                      <StatRow
                        label="Matchs nuls"
                        value={detail.stats.total_draws}
                      />
                    )}
                  </View>
                </>
              )}

              {/* 🔁 FACE-À-FACE */}
              {detail.h2hMatches && detail.h2hMatches.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>🔁 Face-à-face</Text>
                  {detail.h2hMatches.map((h: any, i: number) => (
                    <View key={i} style={styles.h2hRow}>
                      <Text style={styles.h2hDate}>{h.date}</Text>
                      <Text style={styles.h2hTeam} numberOfLines={1}>
                        {h.localteam}
                      </Text>
                      <View style={styles.h2hScoreBox}>
                        <Text style={styles.h2hScore}>{h.scoretime}</Text>
                      </View>
                      <Text style={[styles.h2hTeam, styles.h2hTeamRight]} numberOfLines={1}>
                        {h.visitorteam}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyText}>Aucune donnée</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// Composant ligne de stat
function StatRow({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111', borderTopLeftRadius: 24,
    borderTopRightRadius: 24, padding: 20,
    maxHeight: '88%', minHeight: 450,
    borderTopWidth: 1, borderColor: '#333',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  scoreBox: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 15, gap: 10,
  },
  teamCol: { flex: 1, alignItems: 'center', gap: 8 },
  teamName: {
    color: '#fff', fontSize: 13, textAlign: 'center', fontWeight: '500',
  },
  scoreCol: { alignItems: 'center', gap: 8 },
  bigScore: { color: '#39FF14', fontSize: 30, fontWeight: 'bold' },
  statusPill: {
    backgroundColor: '#1c1c1c', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 12,
  },
  statusText: { color: '#888', fontSize: 11, fontWeight: '600' },

  leagueText: {
    color: '#666', textAlign: 'center', fontSize: 12,
    fontStyle: 'italic', marginBottom: 10,
  },

  infoRow: {
    flexDirection: 'row', justifyContent: 'center',
    gap: 12, flexWrap: 'wrap', marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a1a1a', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8,
  },
  infoText: { color: '#888', fontSize: 11 },

  divider: { height: 1, backgroundColor: '#222', marginBottom: 15 },

  center: { alignItems: 'center', paddingVertical: 30 },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 15, fontWeight: '600' },

  noEvents: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 20,
  },
  noEventsText: { color: '#555', fontSize: 13 },

  sectionTitle: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold',
    marginTop: 10, marginBottom: 10, letterSpacing: 0.5,
  },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: '#1c1c1c', borderRadius: 10, marginBottom: 6,
  },
  eventMinute: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold', minWidth: 35,
  },
  eventIconBox: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#222',
  },
  eventPlayer: { color: '#fff', fontSize: 13, fontWeight: '500' },
  eventTeamSmall: { color: '#666', fontSize: 11, marginTop: 2 },

  statsBox: {
    backgroundColor: '#1a1a1a', borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  statRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#222',
  },
  statLabel: { color: '#888', fontSize: 12 },
  statValue: { color: '#39FF14', fontSize: 13, fontWeight: 'bold' },

  h2hRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a1a1a', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 10, marginBottom: 6,
  },
  h2hDate: { color: '#555', fontSize: 10, width: 60 },
  h2hTeam: { flex: 1, color: '#fff', fontSize: 11 },
  h2hTeamRight: { textAlign: 'right' },
  h2hScoreBox: {
    backgroundColor: '#0a0a0a', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6,
  },
  h2hScore: { color: '#39FF14', fontSize: 11, fontWeight: 'bold' },
});
