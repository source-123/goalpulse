import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, RefreshControl, ScrollView,
  TextInput, Alert, AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchLiveScores, CountryGroup, RawMatch,
  formatTime, isLiveStatus, getStatusLabel,
} from './liveScoreService';
import TeamLogo from './TeamLogo';
import MatchDetail from './MatchDetail';
import { subscribeFavorites, toggleFavorite } from './favoritesService';

interface MatchListProps {
  userEmail: string;
  statusFilter?: 'all' | 'live' | 'finished' | 'upcoming';
}

type Tab = 'all' | 'live' | 'finished' | 'upcoming';

export default function MatchList({ userEmail, statusFilter = 'all' }: MatchListProps) {
  const [groups, setGroups] = useState<CountryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(statusFilter);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<RawMatch | null>(null);
  const [liveCount, setLiveCount] = useState(0);

  // Favoris
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
      // Compter les matchs live
      let live = 0;
      data.forEach((c) =>
        c.leagues.forEach((l) =>
          l.matches.forEach((m) => {
            if (isLiveStatus(m.status)) live++;
          })
        )
      );
      setLiveCount(live);
    } catch (e: any) {
      setError(e.message || 'Erreur');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  // ✅ Refresh intelligent (AppState au lieu de setInterval)
  useEffect(() => {
    loadScores();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') loadScores(true);
    });
    return () => sub.remove();
  }, [loadScores]);

  const onRefresh = () => {
    setRefreshing(true);
    loadScores(true);
  };

  // 🔍 Filtrage
  const filterMatches = (matches: RawMatch[]): RawMatch[] => {
    let filtered = matches;

    if (tab === 'live') {
      filtered = filtered.filter((m) => isLiveStatus(m.status));
    } else if (tab === 'finished') {
      filtered = filtered.filter(
        (m) => m.status === 'FT' || parseInt(m.status, 10) >= 90
      );
    } else if (tab === 'upcoming') {
      filtered = filtered.filter(
        (m) => m.status === 'NS' || m.status === '' || m.status === 'Postp.'
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

  const visibleGroups = useMemo(() => {
    return groups
      .map((c) => ({
        ...c,
        leagues: c.leagues
          .map((l) => ({ ...l, matches: filterMatches(l.matches) }))
          .filter((l) => l.matches.length > 0),
      }))
      .filter((c) => c.leagues.length > 0);
  }, [groups, tab, favorites, search]);

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
    const finished =
      match.status === 'FT' || parseInt(match.status, 10) >= 90;
    const parts = match.scoretime?.split('-').map((s) => s.trim()) || ['-', '-'];
    const homeScore = parts[0] || '-';
    const awayScore = parts[1] || '-';
    const homeFav = favorites.includes(match.localteam);
    const awayFav = favorites.includes(match.visitorteam);

    return (
      <TouchableOpacity
        key={match.id || index}
        style={[styles.matchCard, live && styles.matchCardLive]}
        activeOpacity={0.7}
        onPress={() => setSelectedMatch(match)}
      >
        {/* Bande latérale colorée pour live */}
        {live && <View style={styles.liveBar} />}

        {/* Header */}
        <View style={styles.matchHeader}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.statusBadge,
                live && styles.statusBadgeLive,
                finished && styles.statusBadgeFinished,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  live && styles.statusTextLive,
                  finished && styles.statusTextFinished,
                ]}
              >
                {getStatusLabel(match.status)}
              </Text>
            </View>
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
                size={16}
                color={homeFav ? '#FFD700' : '#444'}
              />
            </TouchableOpacity>
            <TeamLogo name={match.localteam} size={30} />
            <Text style={styles.teamName} numberOfLines={1}>
              {match.localteam}
            </Text>
            <View style={styles.cardsBox}>
              {match.localteamyc ? <View style={styles.yellowCard} /> : null}
              {match.localteamrc ? <View style={styles.redCard} /> : null}
            </View>
          </View>

          {/* Score */}
          <View style={[styles.scoreBox, live && styles.scoreBoxLive]}>
            <Text
              style={[
                styles.scoreText,
                live && styles.scoreTextLive,
                finished && styles.scoreTextFinished,
              ]}
            >
              {homeScore}
            </Text>
            <Text style={styles.scoreSeparator}>-</Text>
            <Text
              style={[
                styles.scoreText,
                live && styles.scoreTextLive,
                finished && styles.scoreTextFinished,
              ]}
            >
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
            <TeamLogo name={match.visitorteam} size={30} />
            <TouchableOpacity
              onPress={() => onToggleFavorite(match.visitorteam)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={awayFav ? 'star' : 'star-outline'}
                size={16}
                color={awayFav ? '#FFD700' : '#444'}
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

      {/* Tabs sections */}
      <View style={styles.tabRow}>
        {[
          { key: 'all', label: 'Tous' },
          { key: 'live', label: '🔴 Live', badge: liveCount },
          { key: 'finished', label: 'Terminés' },
          { key: 'upcoming', label: 'À venir' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key as Tab)}
          >
            <Text
              style={[styles.tabText, tab === t.key && styles.tabTextActive]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
            {t.badge ? (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{t.badge}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowSearch(!showSearch)}
        >
          <Ionicons
            name={showSearch ? 'close' : 'search'}
            size={18}
            color="#39FF14"
          />
        </TouchableOpacity>
      </View>

      {/* Contenu */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#39FF14" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="warning" size={60} color="#FF3366" />
          <Text style={styles.emptyText}>Erreur</Text>
          <Text style={styles.emptySubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadScores()}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : totalVisible === 0 ? (
        <View style={styles.center}>
          <Ionicons name="football-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>Aucun match</Text>
          <Text style={styles.emptySubtext}>
            {tab === 'live'
              ? 'Aucun match en direct actuellement'
              : 'Essaie un autre filtre'}
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
                <Ionicons name="globe-outline" size={12} color="#666" />
                <Text style={styles.countryTitle}>{group.country}</Text>
              </View>

              {group.leagues.map((league, li) => (
                <View key={`l-${li}`} style={styles.leagueBox}>
                  <View style={styles.leagueHeader}>
                    <Ionicons name="trophy" size={11} color="#39FF14" />
                    <Text style={styles.leagueTitle}>{league.league}</Text>
                  </View>
                  {league.matches.map(renderMatch)}
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

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
  container: { flex: 1 },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1c1c1c', borderRadius: 12,
    paddingHorizontal: 15, paddingVertical: 10,
    marginHorizontal: 15, marginBottom: 12,
    borderWidth: 1, borderColor: '#333',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },

  tabRow: {
    flexDirection: 'row', gap: 6, marginBottom: 15,
    paddingHorizontal: 15, alignItems: 'center',
  },
  tabBtn: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 6,
    borderRadius: 10, backgroundColor: '#1c1c1c',
    borderWidth: 1, borderColor: '#333',
    alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 4,
  },
  tabBtnActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  tabText: { color: '#888', fontSize: 11, fontWeight: '600' },
  tabTextActive: { color: '#000' },
  tabBadge: {
    backgroundColor: '#FF3366', borderRadius: 8,
    paddingHorizontal: 5, paddingVertical: 1, minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 18, marginTop: 15, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 5, textAlign: 'center' },
  retryBtn: {
    marginTop: 20, backgroundColor: '#39FF14',
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  retryText: { color: '#000', fontWeight: 'bold' },

  totalCount: {
    color: '#666', fontSize: 12, marginBottom: 12,
    textAlign: 'center', fontStyle: 'italic',
    paddingHorizontal: 15,
  },

  countryBox: { marginBottom: 20 },
  countryHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 8, paddingHorizontal: 15,
  },
  countryTitle: {
    color: '#aaa', fontSize: 11, fontWeight: 'bold',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  leagueBox: { marginBottom: 12, paddingHorizontal: 15 },
  leagueHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    marginBottom: 8, paddingBottom: 4,
    borderBottomWidth: 1, borderBottomColor: '#1f1f1f',
  },
  leagueTitle: { color: '#39FF14', fontSize: 11, fontWeight: 'bold' },

  matchCard: {
    backgroundColor: '#171717', padding: 12, borderRadius: 12,
    marginBottom: 8, borderWidth: 1, borderColor: '#262626',
    overflow: 'hidden',
  },
  matchCardLive: { borderColor: '#39FF1440' },

  liveBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: '#39FF14',
  },

  matchHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: '#262626', borderRadius: 6,
  },
  statusBadgeLive: { backgroundColor: '#39FF1425' },
  statusBadgeFinished: { backgroundColor: '#33333380' },
  statusText: { color: '#999', fontSize: 10, fontWeight: 'bold' },
  statusTextLive: { color: '#39FF14' },
  statusTextFinished: { color: '#666' },
  matchTime: { color: '#666', fontSize: 11, fontWeight: '600' },

  teamsContainer: { gap: 8 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  teamName: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '500' },
  teamNameRight: { textAlign: 'right' },
  cardsBox: { flexDirection: 'row', gap: 3, minWidth: 18 },
  yellowCard: {
    width: 7, height: 10, borderRadius: 2, backgroundColor: '#FFD700',
  },
  redCard: {
    width: 7, height: 10, borderRadius: 2, backgroundColor: '#FF3366',
  },

  scoreBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0a0a0a', paddingVertical: 6,
    borderRadius: 8, gap: 12,
    borderWidth: 1, borderColor: '#222',
  },
  scoreBoxLive: { borderColor: '#39FF1444' },
  scoreText: {
    color: '#fff', fontSize: 20, fontWeight: 'bold',
    minWidth: 26, textAlign: 'center',
  },
  scoreTextLive: { color: '#39FF14' },
  scoreTextFinished: { color: '#999' },
  scoreSeparator: { color: '#555', fontSize: 14 },
});
