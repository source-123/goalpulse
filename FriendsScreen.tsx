import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { subscribeFriends, addFriend, removeFriend, Friend, getFriendPoints } from './friendsService';

interface Props {
  userEmail: string;
}

export default function FriendsScreen({ userEmail }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [points, setPoints] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [adding, setAdding] = useState(false);

  // Écouter les amis
  useEffect(() => {
    const unsub = subscribeFriends(userEmail, async (list) => {
      setFriends(list);
      // Charger les points
      const pts: Record<string, number> = {};
      for (const f of list) {
        pts[f.userKey] = await getFriendPoints(f.userKey);
      }
      setPoints(pts);
      setLoading(false);
    });
    return () => unsub();
  }, [userEmail]);

  const handleAdd = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Erreur', 'Entre un email');
      return;
    }
    setAdding(true);
    const res = await addFriend(userEmail, newEmail.trim().toLowerCase());
    setAdding(false);
    if (res.success) {
      Alert.alert('✅ Ajouté', 'Ton ami a été ajouté !');
      setNewEmail('');
      setShowAdd(false);
    } else {
      Alert.alert('❌ Erreur', res.error || 'Erreur');
    }
  };

  const handleRemove = (friend: Friend) => {
    Alert.alert(
      'Supprimer',
      `Retirer ${friend.displayName} de tes amis ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => await removeFriend(userEmail, friend.userKey),
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          👥 {friends.length} ami{friends.length > 1 ? 's' : ''}
        </Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAdd(!showAdd)}
        >
          <Ionicons
            name={showAdd ? 'close' : 'person-add'}
            size={20}
            color="#000"
          />
        </TouchableOpacity>
      </View>

      {showAdd && (
        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            placeholder="Email de ton ami"
            placeholderTextColor="#666"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Ionicons name="checkmark" size={22} color="#000" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {friends.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>Aucun ami</Text>
          <Text style={styles.emptySubtext}>
            Ajoute des amis pour jouer avec eux
          </Text>
        </View>
      ) : (
        <ScrollView>
          {friends.map((f) => (
            <View key={f.userKey} style={styles.friendItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {f.displayName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{f.displayName}</Text>
                <Text style={styles.friendEmail} numberOfLines={1}>
                  {f.email}
                </Text>
              </View>
              <View style={styles.pointsBadge}>
                <Ionicons name="trophy" size={12} color="#FFD700" />
                <Text style={styles.pointsText}>
                  {points[f.userKey] || 0}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemove(f)}
                style={styles.removeBtn}
              >
                <Ionicons name="trash-outline" size={18} color="#FF3366" />
              </TouchableOpacity>
            </View>
          ))}
          <View style={{ height: 100 }} />
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
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 5, textAlign: 'center' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  addBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center',
  },

  addForm: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 15,
  },
  input: {
    flex: 1,
    backgroundColor: '#1c1c1c',
    color: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    fontSize: 14,
  },
  submitBtn: {
    width: 46, height: 46, borderRadius: 10,
    backgroundColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center',
  },

  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#171717',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#39FF1422',
    borderWidth: 1.5, borderColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#39FF14', fontSize: 15, fontWeight: 'bold' },
  friendInfo: { flex: 1 },
  friendName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  friendEmail: { color: '#666', fontSize: 11, marginTop: 2 },

  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1c1c1c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  pointsText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },

  removeBtn: { padding: 8 },
});
