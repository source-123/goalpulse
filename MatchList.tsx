import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchLiveScores, CountryGroup, RawMatch,
  formatTime, isLiveStatus, getStatusLabel
} from './liveScoreService';

interface MatchListProps {
  userEmail?: string;
}

export default function MatchList({ userEmail }: MatchListProps) {
  const [groups, setGroups] = useState<CountryGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [liveOnly, setLiveOnly] = useState<boolean>(true);

  const loadScores = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchLiveScores();
      setGroups(data);
    } catch (e: any) {
      setError(e.message || 'Erreur de chargement');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadScores();
    // Auto-refresh toutes les 60 secondes
    const interval = setInterval(() => loadScores(true), 60000);
    return () => clearInterval(interval);
  }, [loadScores]);

  const onRefresh = () => {
    setRefreshing(true);
    loadScores(true);
  };

  // Filtrer les matchs selon liveOnly
  const filterMatches = (matches: RawMatch[]): RawMatch[] => {
    if (!liveOnly) return matches;
    return matches.filter((m) => isLiveStatus(m.status));
  };

  // Compter les matchs visibles
  const totalVisible = groups.reduce((sum, c) =>
    sum + c.leagues.reduce((s, l) => s + filterMatches(l.matches).length, 0), 0
  );

  const renderMatch = (match: RawMatch, index: number) => {
    const live = isLiveStatus(match.status);
    // Extraire le score depuis "scoretime": "2 - 1"
    const parts = match.scoretime?.split('-').map((s) => s.trim()) || ['-', '-'];
    const homeScore = parts[0] || '-';
    const awayScore = parts[1] || '-';

    return (
      <View key={match.id || index} style={styles.matchItem}>
        {/* Header : heure + statut */}
        <View style={styles.matchHeader}>
          <Text style={styles.matchTime}>{formatTime(match.time)}</Text>
          <Text style={[styles.matchStatus, live && styles.matchStatusLive]}>
            {getStatusLabel(match.status)}
          </Text>
        </View>

        {/* Équipes + Score */}
        <View style={styles.teamsRow}>
          <View style={styles.teamBox}>
            <Text style={styles.teamName} numberOfLines={2}>
              {match.localteam}
            </Text>
            {(match.localteamyc || match.localteamrc) && (
              <View style={styles.cardsRow}>
                {match.localteamyc ? (
                  <View style={[styles.card, styles.yellowCard]} />
                ) : null}
                {match.localteamrc ? (
                  <View style={[styles.card, styles.redCard]} />
                ) : null}
              </View>
            )}
          </View>

          <View style={styles.scoreBox}>
            <Text style={[styles.scoreText, live && styles.scoreLive]}>
              {homeScore}
            </Text>
            <Text style={styles.scoreSep}>-</Text>
            <Text style={[styles.scoreText, live && styles.scoreLive]}>
              {awayScore}
            </Text>
          </View>

          <View style={[styles.teamBox, styles.teamBoxRight]}>
            <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={2}>
              {match.visitorteam}
            </Text>
            {(match.visitorteamyc || match.visitorteamrc) && (
              <View style={styles.cardsRow}>
                {match.visitorteamyc ? (
                  <View style={[styles.card, styles.yellowCard]} />
                ) : null}
                {match.visitorteamrc ? (
                  <View style={[styles.card, styles.redCard]} />
                ) : null}
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Chargement des scores...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Barre de filtres */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, liveOnly && styles.filterBtnActive]}
          onPress={() => setLiveOnly(true)}
        >
          <Text style={[styles.filterText, liveOnly && styles.filterTextActive]}>
            🔴 En direct
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, !liveOnly && styles.filterBtnActive]}
          onPress={() => setLiveOnly(false)}
        >
          <Text style={[styles.filterText, !liveOnly && styles.filterTextActive]}>
            📋 Tous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#39FF14" />
        </TouchableOpacity>
      </View>

      {/* Erreur */}
      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="warning" size={20} color="#FF3366" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Liste */}
      {totalVisible === 0 ? (
        <View style={styles.center}>
          <Ionicons name="football-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>
            {liveOnly ? 'Aucun match en direct' : 'Aucun match'}
          </Text>
          <Text style={styles.emptySubtext}>Tire vers le bas pour rafraîchir</Text>
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
          <Text style={styles.totalCount}>
            {totalVisible} match{totalVisible > 1 ? 's' : ''} affiché{totalVisible > 1 ? 's' : ''}
          </Text>

          {groups.map((group, ci) => {
            const visibleLeagues = group.leagues
              .map((l) => ({ ...l, matches: filterMatches(l.matches) }))
              .filter((l) => l.matches.length > 0);

            if (visibleLeagues.length === 0) return null;

            return (
              <View key={`country-${ci}`} style={styles.countryBox}>
                <View style={styles.countryHeader}>
                  <Ionicons name="globe-outline" size={14} color="#888" />
                  <Text style={styles.countryTitle}>{group.country}</Text>
                </View>

                {visibleLeagues.map((league, li) => (
                  <View key={`league-${li}`} style={styles.leagueBox}>
                    <View style={styles.leagueHeader}>
                      <Ionicons name="trophy" size={14} color="#39FF14" />
                      <Text style={styles.leagueTitle}>{league.league}</Text>
                    </View>
                    {league.matches.map(renderMatch)}
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 18, marginTop: 15, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 14, marginTop: 5 },

  filterRow: {
    flexDirection: 'row', gap: 8, marginBottom: 15, alignItems: 'center',
  },
  filterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  filterText: { color: '#888', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#000' },
  refreshBtn: {
    width: 45, height: 45, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2a0a12', padding: 12, borderRadius: 10,
    marginBottom: 15, borderWidth: 1, borderColor: '#FF3366',
  },
  errorText: { color: '#FF3366', fontSize: 13, flex: 1 },

  totalCount: {
    color: '#666', fontSize: 12, marginBottom: 12,
    textAlign: 'center', fontStyle: 'italic',
  },

  countryBox: { marginBottom: 25 },
  countryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10,
  },
  countryTitle: {
    color: '#aaa', fontSize: 13, fontWeight: 'bold',
    letterSpacing: 1, textTransform: 'uppercase',
  },

  leagueBox: { marginBottom: 15, paddingLeft: 8 },
  leagueHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 8, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#222',
  },
  leagueTitle: { color: '#39FF14', fontSize: 13, fontWeight: 'bold' },

  matchItem: {
    backgroundColor: '#1c1c1c', padding: 12, borderRadius: 10,
    marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  matchHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  matchTime: { color: '#888', fontSize: 11, fontWeight: '600' },
  matchStatus: { color: '#666', fontSize: 11 },
  matchStatusLive: { color: '#39FF14', fontWeight: 'bold' },

  teamsRow: { flexDirection: 'row', alignItems: 'center' },
  teamBox: { flex: 1 },
  teamBoxRight: { alignItems: 'flex-end' },
  teamName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  teamNameRight: { textAlign: 'right' },

  cardsRow: { flexDirection: 'row', gap: 3, marginTop: 4 },
  card: { width: 8, height: 11, borderRadius: 2 },
  yellowCard: { backgroundColor: '#FFD700' },
  redCard: { backgroundColor: '#FF3366' },

  scoreBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0a0a0a', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8, marginHorizontal: 10, gap: 6,
    borderWidth: 1, borderColor: '#333',
  },
  scoreText: { color: '#fff', fontSize: 16, fontWeight: 'bold', minWidth: 18, textAlign: 'center' },
  scoreLive: { color: '#39FF14' },
  scoreSep: { color: '#555', fontSize: 14 },
});
