import { AppState } from 'react-native';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, ScrollView,
  TextInput, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchLiveScores, CountryGroup, RawMatch,
  formatTime, isLiveStatus, getStatusLabel
} from './liveScoreService';
import TeamLogo from './TeamLogo';
import MatchDetail from './MatchDetail';
import { subscribeFavorites, toggleFavorite } from './favoritesService';

interface MatchListProps {
  userEmail: string;
}

type Filter = 'live' | 'all' | 'favorites';

export default function MatchList({ userEmail }: MatchListProps) {
  const [groups, setGroups] = useState<CountryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('live');
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<RawMatch | null>(null);

  // ⭐ Écouter les favoris en temps réel
  useEffect(() => {
    const unsub = subscribeFavorites(userEmail, setFavorites);
    return () => unsub();
  }, [userEmail]);

  const loadScores = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await fetchLiveScores();
      setGroups(data);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

 useEffect(() => {
  loadScores();

  const subscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      loadScores(true); // silent reload
    }
  });

  return () => subscription.remove();
}, [loadScores]);

  const onRefresh = () => {
    setRefreshing(true);
    loadScores(true);
  };

  // 🎯 Filtrage
  const filterMatches = (matches: RawMatch[]): RawMatch[] => {
    let filtered = matches;

    if (filter === 'live') {
      filtered = filtered.filter((m) => isLiveStatus(m.status));
    } else if (filter === 'favorites') {
      filtered = filtered.filter(
        (m) =>
          favorites.includes(m.localteam) ||
          favorites.includes(m.visitorteam)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (m) =>
          m.localteam.toLowerCase().includes(q) ||
          m.visitorteam.toLowerCase().includes(q) ||
          m.leaguename.toLowerCase().includes(q) ||
          m.country?.toLowerCase().includes(q)
      );
    }

    return filtered;
  };

  // Groupes visibles
  const visibleGroups = useMemo(() => {
    return groups
      .map((c) => ({
        ...c,
        leagues: c.leagues
          .map((l) => ({ ...l, matches: filterMatches(l.matches) }))
          .filter((l) => l.matches.length > 0),
      }))
      .filter((c) => c.leagues.length > 0);
  }, [groups, filter, favorites, search]);

  const totalVisible = visibleGroups.reduce(
    (sum, c) => sum + c.leagues.reduce((s, l) => s + l.matches.length, 0),
    0
  );

  const onToggleFavorite = async (teamName: string) => {
    const isFav = favorites.includes(teamName);
    try {
      await toggleFavorite(userEmail, teamName, isFav);
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    }
  };

  const renderMatch = (match: RawMatch, index: number) => {
    const live = isLiveStatus(match.status);
    const parts = match.scoretime?.split('-').map((s) => s.trim()) || ['-', '-'];
    const homeScore = parts[0] || '-';
    const awayScore = parts[1] || '-';
    const homeFav = favorites.includes(match.localteam);
    const awayFav = favorites.includes(match.visitorteam);

    return (
      <TouchableOpacity
        key={match.id || index}
        style={styles.matchCard}
        activeOpacity={0.7}
        onPress={() => setSelectedMatch(match)}
      >
        {/* Header statut */}
        <View style={styles.matchHeader}>
          <View style={[styles.statusBadge, live && styles.statusBadgeLive]}>
            <Text style={[styles.statusText, live && styles.statusTextLive]}>
              {getStatusLabel(match.status)}
            </Text>
          </View>
          <Text style={styles.matchTime}>{formatTime(match.time)}</Text>
        </View>

        {/* Équipes */}
        <View style={styles.teamsContainer}>
          {/* Domicile */}
          <View style={styles.teamRow}>
            <TouchableOpacity
              onPress={() => onToggleFavorite(match.localteam)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={homeFav ? 'star' : 'star-outline'}
                size={18}
                color={homeFav ? '#FFD700' : '#444'}
                style={styles.starIcon}
              />
            </TouchableOpacity>
            <TeamLogo name={match.localteam} size={32} />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.localteam}
            </Text>
            <View style={styles.cardsBox}>
              {match.localteamyc ? <View style={styles.yellowCard} /> : null}
              {match.localteamrc ? <View style={styles.redCard} /> : null}
            </View>
          </View>

          {/* Score central */}
          <View style={[styles.scoreBox, live && styles.scoreBoxLive]}>
            <Text style={[styles.scoreText, live && styles.scoreTextLive]}>
              {homeScore}
            </Text>
            <Text style={styles.scoreSeparator}>-</Text>
            <Text style={[styles.scoreText, live && styles.scoreTextLive]}>
              {awayScore}
            </Text>
          </View>

          {/* Extérieur */}
          <View style={styles.teamRow}>
            <View style={styles.cardsBox}>
              {match.visitorteamyc ? <View style={styles.yellowCard} /> : null}
              {match.visitorteamrc ? <View style={styles.redCard} /> : null}
            </View>
            <Text style={[styles.teamName, styles.teamNameRight]} numberOfLines={1}>
              {match.visitorteam}
            </Text>
            <TeamLogo name={match.visitorteam} size={32} />
            <TouchableOpacity
              onPress={() => onToggleFavorite(match.visitorteam)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={awayFav ? 'star' : 'star-outline'}
                size={18}
                color={awayFav ? '#FFD700' : '#444'}
                style={styles.starIcon}
              />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      {showSearch && (
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Équipe, ligue, pays..."
            placeholderTextColor="#666"
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Filtres */}
      <View style={styles.filterRow}>
        {[
          { key: 'live', label: '🔴 Live' },
          { key: 'all', label: '📋 Tous' },
          { key: 'favorites', label: '⭐ Favoris' },
        ].map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key as Filter)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowSearch(!showSearch)}
        >
          <Ionicons
            name={showSearch ? 'close' : 'search'}
            size={20}
            color="#39FF14"
          />
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39FF14" />
          <Text style={styles.loadingText}>Chargement des scores...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning" size={60} color="#FF3366" />
          <Text style={styles.emptyText}>Erreur de connexion</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadScores()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : totalVisible === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name={filter === 'favorites' ? 'star-outline' : 'football-outline'}
            size={60}
            color="#333"
          />
          <Text style={styles.emptyText}>
            {filter === 'favorites'
              ? 'Aucun favori'
              : filter === 'live'
              ? 'Aucun match en direct'
              : 'Aucun match'}
          </Text>
          <Text style={styles.emptySubtext}>
            {filter === 'favorites'
              ? 'Appuie sur ⭐ pour suivre une équipe'
              : 'Tire vers le bas pour rafraîchir'}
          </Text>
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
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.totalCount}>
            {totalVisible} match{totalVisible > 1 ? 's' : ''}
            {search ? ` pour "${search}"` : ''}
          </Text>

          {visibleGroups.map((group, ci) => (
            <View key={`c-${ci}`} style={styles.countryBox}>
              <View style={styles.countryHeader}>
                <Ionicons name="globe-outline" size={14} color="#666" />
                <Text style={styles.countryTitle}>{group.country}</Text>
              </View>

              {group.leagues.map((league, li) => (
                <View key={`l-${li}`} style={styles.leagueBox}>
                  <View style={styles.leagueHeader}>
                    <Ionicons name="trophy" size={12} color="#39FF14" />
                    <Text style={styles.leagueTitle}>{league.league}</Text>
                  </View>
                  {league.matches.map(renderMatch)}
                </View>
              ))}
            </View>
          ))}

          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* 📊 Modal Détail Match */}
      <MatchDetail
        visible={!!selectedMatch}
        matchId={selectedMatch?.id || null}
        homeTeam={selectedMatch?.localteam || ''}
        awayTeam={selectedMatch?.visitorteam || ''}
        scoretime={selectedMatch?.scoretime || ''}
        status={getStatusLabel(selectedMatch?.status || '')}
        league={selectedMatch?.leaguename || ''}
        onClose={() => setSelectedMatch(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 18, marginTop: 15, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 14, marginTop: 5, textAlign: 'center' },
  retryBtn: {
    marginTop: 20, backgroundColor: '#39FF14',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  retryText: { color: '#000', fontWeight: 'bold' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1c1c1c', borderRadius: 12,
    paddingHorizontal: 15, paddingVertical: 10,
    marginBottom: 12, borderWidth: 1, borderColor: '#333',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15 },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 15, alignItems: 'center' },
  filterBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
    alignItems: 'center',
  },
  filterBtnActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  filterText: { color: '#888', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: '#000' },
  iconBtn: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },

  totalCount: {
    color: '#666', fontSize: 12, marginBottom: 12,
    textAlign: 'center', fontStyle: 'italic',
  },

  countryBox: { marginBottom: 20 },
  countryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  countryTitle: {
    color: '#aaa', fontSize: 12, fontWeight: 'bold',
    letterSpacing: 1, textTransform: 'uppercase',
  },

  leagueBox: { marginBottom: 12, paddingLeft: 6 },
  leagueHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 8, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#222',
  },
  leagueTitle: { color: '#39FF14', fontSize: 12, fontWeight: 'bold' },

  matchCard: {
    backgroundColor: '#1a1a1a', padding: 12, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#2a2a2a',
  },
  matchHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#222', borderRadius: 6,
  },
  statusBadgeLive: { backgroundColor: '#39FF1422' },
  statusText: { color: '#888', fontSize: 10, fontWeight: 'bold' },
  statusTextLive: { color: '#39FF14' },
  matchTime: { color: '#666', fontSize: 11, fontWeight: '600' },

  teamsContainer: { gap: 8 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starIcon: { padding: 2 },
  teamName: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  teamNameRight: { textAlign: 'right' },
  cardsBox: { flexDirection: 'row', gap: 3, minWidth: 20 },
  yellowCard: {
    width: 8, height: 11, borderRadius: 2, backgroundColor: '#FFD700',
  },
  redCard: {
    width: 8, height: 11, borderRadius: 2, backgroundColor: '#FF3366',
  },

  scoreBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0a0a0a', paddingVertical: 8,
    borderRadius: 8, gap: 12,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  scoreBoxLive: { borderColor: '#39FF1444' },
  scoreText: {
    color: '#fff', fontSize: 22, fontWeight: 'bold',
    minWidth: 30, textAlign: 'center',
  },
  scoreTextLive: { color: '#39FF14' },
  scoreSeparator: { color: '#555', fontSize: 16 },
});
