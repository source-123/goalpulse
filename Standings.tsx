import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, RefreshControl, Alert, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchStandings } from './liveScoreService';
import TeamLogo from './TeamLogo';

const COMPETITIONS = [
  { code: 'PL', name: 'Premier League', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
  { code: 'PD', name: 'La Liga', flag: '🇪🇸' },
  { code: 'SA', name: 'Serie A', flag: '🇮🇹' },
  { code: 'BL1', name: 'Bundesliga', flag: '🇩🇪' },
  { code: 'FL1', name: 'Ligue 1', flag: '🇫🇷' },
  { code: 'CL', name: 'Champions League', flag: '🇪🇺' },
  { code: 'DED', name: 'Eredivisie', flag: '🇳🇱' },
  { code: 'PPL', name: 'Primeira Liga', flag: '🇵🇹' },
  { code: 'BSA', name: 'Brasileirão', flag: '🇧🇷' },
];

interface Row {
  position: number;
  team: string;
  crest?: string;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

export default function Standings() {
  const [selected, setSelected] = useState('PL');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [competitionName, setCompetitionName] = useState('');
  const [season, setSeason] = useState('');

  const load = async (code: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const result = await fetchStandings(code);
      setRows(result.rows);
      setCompetitionName(result.competition);
      setSeason(result.season);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
      setRows([]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load(selected);
  }, [selected]);

  const onRefresh = () => {
    setRefreshing(true);
    load(selected, true);
  };

  const getPosColor = (pos: number, total: number): string => {
    if (pos <= 4) return '#39FF14';
    if (pos <= 6) return '#00BFFF';
    if (pos >= total - 2) return '#FF3366';
    return '#666';
  };

  return (
    <View style={styles.container}>
      {/* Sélecteur compétition */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.compScroll}
        contentContainerStyle={styles.compContainer}
      >
        {COMPETITIONS.map((c) => (
          <TouchableOpacity
            key={c.code}
            style={[
              styles.compChip,
              selected === c.code && styles.compChipActive,
            ]}
            onPress={() => setSelected(c.code)}
          >
            <Text style={styles.compFlag}>{c.flag}</Text>
            <Text
              style={[
                styles.compText,
                selected === c.code && styles.compTextActive,
              ]}
            >
              {c.code}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Titre compétition + saison */}
      {competitionName ? (
        <View style={styles.titleRow}>
          <Ionicons name="trophy" size={18} color="#39FF14" />
          <Text style={styles.titleText}>{competitionName}</Text>
          {season ? <Text style={styles.seasonText}>{season}</Text> : null}
        </View>
      ) : null}

      {/* Contenu */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39FF14" />
          <Text style={styles.loadingText}>Chargement du classement...</Text>
        </View>
      ) : rows.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="trophy-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>Aucun classement</Text>
          <Text style={styles.emptySubtext}>Essaie une autre compétition</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#39FF14"
            />
          }
        >
          {/* En-tête tableau */}
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.thPos]}>#</Text>
            <Text style={[styles.th, styles.thTeam]}>Équipe</Text>
            <Text style={[styles.th, styles.thStat]}>J</Text>
            <Text style={[styles.th, styles.thStat]}>V</Text>
            <Text style={[styles.th, styles.thStat]}>N</Text>
            <Text style={[styles.th, styles.thStat]}>D</Text>
            <Text style={[styles.th, styles.thStat]}>+/-</Text>
            <Text style={[styles.th, styles.thPts]}>Pts</Text>
          </View>

          {/* Lignes */}
          {rows.map((row, i) => (
            <View key={i} style={styles.row}>
              <View
                style={[
                  styles.posBar,
                  { backgroundColor: getPosColor(row.position, rows.length) },
                ]}
              />
              <Text style={[styles.td, styles.thPos, styles.tdBold]}>
                {row.position}
              </Text>
              <View style={styles.teamCell}>
                <TeamLogo name={row.team} crest={row.crest} size={24} />
                <Text style={styles.teamText} numberOfLines={1}>
                  {row.team}
                </Text>
              </View>
              <Text style={[styles.td, styles.thStat]}>{row.played}</Text>
              <Text style={[styles.td, styles.thStat]}>{row.won}</Text>
              <Text style={[styles.td, styles.thStat]}>{row.draw}</Text>
              <Text style={[styles.td, styles.thStat]}>{row.lost}</Text>
              <Text
                style={[
                  styles.td,
                  styles.thStat,
                  { color: row.goalDiff > 0 ? '#39FF14' : row.goalDiff < 0 ? '#FF3366' : '#666' },
                ]}
              >
                {row.goalDiff > 0 ? `+${row.goalDiff}` : row.goalDiff}
              </Text>
              <Text style={[styles.td, styles.thPts, styles.tdBold]}>
                {row.points}
              </Text>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  compScroll: { maxHeight: 60, marginBottom: 10 },
  compContainer: { paddingHorizontal: 15, gap: 8 },
  compChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  compChipActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  compFlag: { fontSize: 13 },
  compText: { color: '#888', fontSize: 12, fontWeight: 'bold' },
  compTextActive: { color: '#000' },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    marginBottom: 12,
  },
  titleText: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1 },
  seasonText: { color: '#666', fontSize: 12, fontStyle: 'italic' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 18, marginTop: 15, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 14, marginTop: 5 },

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#0f0f0f',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#222',
  },
  th: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  thPos: { width: 24 },
  thTeam: { flex: 1, textAlign: 'left', marginLeft: 8 },
  thStat: { width: 24 },
  thPts: { width: 32, color: '#39FF14' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#181818',
    position: 'relative',
  },
  posBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  td: {
    color: '#ccc',
    fontSize: 12,
    textAlign: 'center',
  },
  tdBold: { fontWeight: 'bold', color: '#fff' },
  teamCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  teamText: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1 },
});
