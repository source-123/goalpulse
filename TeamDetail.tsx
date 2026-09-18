import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, ScrollView, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  searchTeam, getTeamPlayers, getTeamLastEvents, getTeamNextEvents,
  computeForm, TeamInfo, TeamPlayer, TeamEvent,
} from './teamService';

interface Props {
  visible: boolean;
  teamName: string;
  onClose: () => void;
}

type Tab = 'info' | 'players' | 'results' | 'next';

export default function TeamDetail({ visible, teamName, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [lastEvents, setLastEvents] = useState<TeamEvent[]>([]);
  const [nextEvents, setNextEvents] = useState<TeamEvent[]>([]);
  const [form, setForm] = useState<Array<'W' | 'D' | 'L'>>([]);
  const [tab, setTab] = useState<Tab>('info');

  useEffect(() => {
    if (visible && teamName) {
      loadTeam();
    } else {
      setTeam(null);
      setPlayers([]);
      setLastEvents([]);
      setNextEvents([]);
      setForm([]);
      setTab('info');
    }
  }, [visible, teamName]);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const teams = await searchTeam(teamName);
      if (teams.length === 0) {
        setLoading(false);
        return;
      }
      const t = teams[0];
      setTeam(t);

      // Charger en parallèle
      const [playersData, lastData, nextData] = await Promise.all([
        getTeamPlayers(t.idTeam),
        getTeamLastEvents(t.idTeam),
        getTeamNextEvents(t.idTeam),
      ]);

      setPlayers(playersData);
      setLastEvents(lastData);
      setNextEvents(nextData);
      setForm(computeForm(lastData, t.strTeam));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const renderFormBadge = (result: 'W' | 'D' | 'L', i: number) => {
    const colors = { W: '#39FF14', D: '#FFD700', L: '#FF3366' };
    const labels = { W: 'V', D: 'N', L: 'D' };
    return (
      <View
        key={i}
        style={[styles.formBadge, { backgroundColor: colors[result] }]}
      >
        <Text style={styles.formBadgeText}>{labels[result]}</Text>
      </View>
    );
  };

  const renderEvent = (ev: TeamEvent, i: number) => {
    const homeScore = ev.intHomeScore ?? '-';
    const awayScore = ev.intAwayScore ?? '-';
    const isUpcoming = !ev.intHomeScore;

    return (
      <View key={i} style={styles.eventRow}>
        <Text style={styles.eventDate}>
          {ev.dateEvent?.split('-').reverse().slice(0, 2).join('/')}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventHome} numberOfLines={1}>{ev.strHomeTeam}</Text>
          <Text style={styles.eventAway} numberOfLines={1}>{ev.strAwayTeam}</Text>
        </View>
        <View style={styles.eventScoreBox}>
          {isUpcoming ? (
            <Text style={styles.eventTime}>{ev.strTime?.slice(0, 5) || '--:--'}</Text>
          ) : (
            <>
              <Text style={styles.eventScore}>{homeScore}</Text>
              <Text style={styles.eventScore}>-</Text>
              <Text style={styles.eventScore}>{awayScore}</Text>
            </>
          )}
        </View>
      </View>
    );
  };

  if (!visible) return null;

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

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color="#39FF14" />
              <Text style={styles.loadingText}>Chargement de l'équipe...</Text>
            </View>
          ) : !team ? (
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={60} color="#444" />
              <Text style={styles.emptyText}>Équipe introuvable</Text>
              <Text style={styles.emptySubtext}>
                "{teamName}" n'est pas dans la base
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* HERO */}
              <View style={styles.hero}>
                {team.strTeamBadge && (
                  <Image
                    source={{ uri: team.strTeamBadge }}
                    style={styles.teamBadge}
                    resizeMode="contain"
                  />
                )}
                <Text style={styles.teamName}>{team.strTeam}</Text>
                {team.strAlternate && team.strAlternate !== team.strTeam && (
                  <Text style={styles.teamAlt}>{team.strAlternate}</Text>
                )}
                <View style={styles.chipsRow}>
                  {team.strCountry && (
                    <View style={styles.chip}>
                      <Ionicons name="flag-outline" size={12} color="#39FF14" />
                      <Text style={styles.chipText}>{team.strCountry}</Text>
                    </View>
                  )}
                  {team.intFormedYear && (
                    <View style={styles.chip}>
                      <Ionicons name="calendar-outline" size={12} color="#39FF14" />
                      <Text style={styles.chipText}>{team.intFormedYear}</Text>
                    </View>
                  )}
                  {team.strStadium && (
                    <View style={styles.chip}>
                      <Ionicons name="business-outline" size={12} color="#39FF14" />
                      <Text style={styles.chipText} numberOfLines={1}>
                        {team.strStadium}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Forme */}
                {form.length > 0 && (
                  <View style={styles.formRow}>
                    <Text style={styles.formLabel}>Forme :</Text>
                    {form.map(renderFormBadge)}
                  </View>
                )}
              </View>

              {/* TABS */}
              <View style={styles.tabsRow}>
                {[
                  { key: 'info', label: '📊 Info' },
                  { key: 'players', label: `👥 Effectif (${players.length})` },
                  { key: 'results', label: '📅 Résultats' },
                  { key: 'next', label: '⏰ À venir' },
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

              {/* TAB INFO */}
              {tab === 'info' && (
                <View style={styles.tabContent}>
                  {team.strStadium && (
                    <InfoRow icon="business" label="Stade" value={team.strStadium} />
                  )}
                  {team.intStadiumCapacity && (
                    <InfoRow
                      icon="people"
                      label="Capacité"
                      value={`${parseInt(team.intStadiumCapacity, 10).toLocaleString('fr-FR')} places`}
                    />
                  )}
                  {team.strStadiumLocation && (
                    <InfoRow icon="location" label="Ville" value={team.strStadiumLocation} />
                  )}
                  {team.strManager && (
                    <InfoRow icon="person" label="Entraîneur" value={team.strManager} />
                  )}
                  {team.strLeague && (
                    <InfoRow icon="trophy" label="Ligue" value={team.strLeague} />
                  )}
                  {team.strWebsite && (
                    <TouchableOpacity
                      style={styles.linkRow}
                      onPress={() => Linking.openURL(`https://${team.strWebsite}`)}
                    >
                      <Ionicons name="globe" size={16} color="#39FF14" />
                      <Text style={styles.linkText} numberOfLines={1}>
                        {team.strWebsite}
                      </Text>
                      <Ionicons name="open-outline" size={14} color="#39FF14" />
                    </TouchableOpacity>
                  )}

                  {team.strDescriptionFR || team.strDescriptionEN ? (
                    <View style={styles.descBox}>
                      <Text style={styles.descTitle}>À propos</Text>
                      <Text style={styles.descText} numberOfLines={8}>
                        {team.strDescriptionFR || team.strDescriptionEN}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* TAB PLAYERS */}
              {tab === 'players' && (
                <View style={styles.tabContent}>
                  {players.length === 0 ? (
                    <View style={styles.center}>
                      <Ionicons name="people-outline" size={60} color="#333" />
                      <Text style={styles.emptyText}>Effectif indisponible</Text>
                    </View>
                  ) : (
                    players.map((p, i) => (
                      <View key={i} style={styles.playerRow}>
                        {p.strThumb ? (
                          <Image
                            source={{ uri: p.strThumb }}
                            style={styles.playerPhoto}
                          />
                        ) : (
                          <View style={styles.playerPhotoPlaceholder}>
                            <Ionicons name="person" size={18} color="#666" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.playerName} numberOfLines={1}>
                            {p.strNumber ? `#${p.strNumber} ` : ''}{p.strPlayer}
                          </Text>
                          <Text style={styles.playerMeta}>
                            {p.strPosition || 'Joueur'}
                            {p.strNationality ? ` • ${p.strNationality}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* TAB RESULTS */}
              {tab === 'results' && (
                <View style={styles.tabContent}>
                  {lastEvents.length === 0 ? (
                    <View style={styles.center}>
                      <Ionicons name="calendar-outline" size={60} color="#333" />
                      <Text style={styles.emptyText}>Aucun match récent</Text>
                    </View>
                  ) : (
                    lastEvents.map(renderEvent)
                  )}
                </View>
              )}

              {/* TAB NEXT */}
              {tab === 'next' && (
                <View style={styles.tabContent}>
                  {nextEvents.length === 0 ? (
                    <View style={styles.center}>
                      <Ionicons name="time-outline" size={60} color="#333" />
                      <Text style={styles.emptyText}>Aucun match à venir</Text>
                    </View>
                  ) : (
                    nextEvents.map(renderEvent)
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Ionicons name={icon} size={14} color="#39FF14" />
      </View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
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
    justifyContent: 'flex-end',
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
  },

  center: { alignItems: 'center', paddingVertical: 60 },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 16, marginTop: 12, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 12, marginTop: 4, textAlign: 'center' },

  // HERO
  hero: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 15,
  },
  teamBadge: {
    width: 90,
    height: 90,
    marginBottom: 12,
  },
  teamName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  teamAlt: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262626',
    maxWidth: '80%',
  },
  chipText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
    maxWidth: 150,
  },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 15,
  },
  formLabel: { color: '#666', fontSize: 12 },
  formBadge: {
    width: 24, height: 24, borderRadius: 6,
    justifyContent: 'center', alignItems: 'center',
  },
  formBadgeText: {
    color: '#000', fontSize: 11, fontWeight: 'bold',
  },

  // TABS
  tabsRow: {
    flexDirection: 'row', gap: 5, marginBottom: 15,
  },
  tabBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#262626',
    alignItems: 'center',
  },
  tabBtnActive: { backgroundColor: '#39FF14', borderColor: '#39FF14' },
  tabText: { color: '#888', fontSize: 10, fontWeight: '600' },
  tabTextActive: { color: '#000' },

  tabContent: { gap: 8 },

  // INFO
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#262626',
  },
  infoIconBox: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#39FF1420',
    justifyContent: 'center', alignItems: 'center',
  },
  infoLabel: { color: '#888', fontSize: 12, flex: 1 },
  infoValue: {
    color: '#fff', fontSize: 13, fontWeight: '600',
    maxWidth: '55%', textAlign: 'right',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#39FF1440',
  },
  linkText: { color: '#39FF14', fontSize: 13, flex: 1, fontWeight: '600' },

  descBox: {
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#262626',
    marginTop: 10,
  },
  descTitle: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold',
    marginBottom: 8,
  },
  descText: {
    color: '#ccc', fontSize: 12, lineHeight: 18,
  },

  // PLAYERS
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#262626',
  },
  playerPhoto: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#222',
  },
  playerPhotoPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1, borderColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  playerName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  playerMeta: { color: '#666', fontSize: 11, marginTop: 2 },

  // EVENTS
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1a1a1a',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1, borderColor: '#262626',
  },
  eventDate: {
    color: '#666', fontSize: 10, width: 42,
    fontWeight: '600',
  },
  eventHome: { color: '#fff', fontSize: 12, fontWeight: '500' },
  eventAway: { color: '#999', fontSize: 12, marginTop: 2 },
  eventScoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0a0a0a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  eventScore: {
    color: '#39FF14', fontSize: 14, fontWeight: 'bold',
    minWidth: 14, textAlign: 'center',
  },
  eventTime: {
    color: '#00BFFF', fontSize: 12, fontWeight: 'bold',
  },
});
