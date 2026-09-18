import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ref, get } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';
import { sendPushNotification } from './notificationService';
import {
  subscribeMyRooms, createRoom, joinRoom, Room,
} from './roomService';

interface Props {
  userEmail: string;
  userName: string;
  onOpenRoom: (code: string, name: string) => void;
}

export default function RoomsScreen({ userEmail, userName, onOpenRoom }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 3000);

    const unsub = subscribeMyRooms(userEmail, (list) => {
      setRooms(list);
      setLoading(false);
      clearTimeout(timeout);
    });
    return () => {
      clearTimeout(timeout);
      unsub();
    };
  }, [userEmail]);

  const handleCreate = async () => {
    if (!roomName.trim()) {
      Alert.alert('Erreur', 'Donne un nom à ton salon');
      return;
    }
    setProcessing(true);
    const res = await createRoom(userEmail, userName, roomName.trim());
    setProcessing(false);
    if (res.success && res.code) {
      setShowCreate(false);
      setRoomName('');
      Alert.alert('🎉 Salon créé !', `Code : ${res.code}\n\nPartage avec tes amis !`);
    } else {
      Alert.alert('Erreur', res.error || 'Erreur');
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Erreur', 'Entre un code');
      return;
    }
    setProcessing(true);
    const res = await joinRoom(userEmail, userName, joinCode);
    setProcessing(false);
    if (res.success) {
      const joinedCode = joinCode.trim().toUpperCase();
      setShowJoin(false);
      setJoinCode('');

      // 🔔 Notifier le créateur du salon
      try {
        const creatorSnap = await get(
          ref(database, `rooms/${joinedCode}/info/createdBy`)
        );
        if (creatorSnap.exists()) {
          const creatorKey = creatorSnap.val();
          const myKey = getUserKey(userEmail);
          if (creatorKey !== myKey) {
            sendPushNotification(
              [creatorKey],
              '👥 Nouveau membre !',
              `${userName} a rejoint ton salon "${res.roomName}"`,
              { roomCode: joinedCode }
            );
          }
        }
      } catch (e) {
        console.error('Erreur notif:', e);
      }

      Alert.alert('✅ Rejoint', `Bienvenue dans "${res.roomName}"`);
      onOpenRoom(joinedCode, res.roomName || 'Salon');
    } else {
      Alert.alert('Erreur', res.error || 'Erreur');
    }
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
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnCreate]}
          onPress={() => setShowCreate(true)}
        >
          <Ionicons name="add-circle" size={20} color="#000" />
          <Text style={styles.actionBtnText}>Créer</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnJoin]}
          onPress={() => setShowJoin(true)}
        >
          <Ionicons name="enter" size={20} color="#39FF14" />
          <Text style={[styles.actionBtnText, { color: '#39FF14' }]}>Rejoindre</Text>
        </TouchableOpacity>
      </View>

      {rooms.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="game-controller-outline" size={60} color="#333" />
          <Text style={styles.emptyText}>Aucun salon</Text>
          <Text style={styles.emptySubtext}>
            Crée un salon et partage le code avec tes amis
          </Text>
        </View>
      ) : (
        <ScrollView>
          <Text style={styles.sectionTitle}>🎮 Mes salons ({rooms.length})</Text>
          {rooms.map((room) => {
            const memberCount = Object.keys(room.members || {}).length;
            return (
              <TouchableOpacity
                key={room.code}
                style={styles.roomCard}
                onPress={() => onOpenRoom(room.code, room.name)}
                activeOpacity={0.7}
              >
                <View style={styles.roomIcon}>
                  <Ionicons name="game-controller" size={24} color="#39FF14" />
                </View>
                <View style={styles.roomInfo}>
                  <Text style={styles.roomName} numberOfLines={1}>{room.name}</Text>
                  <View style={styles.roomMeta}>
                    <Text style={styles.roomCode}>{room.code}</Text>
                    <Text style={styles.roomSep}>•</Text>
                    <Ionicons name="people" size={12} color="#666" />
                    <Text style={styles.roomMembers}>{memberCount}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Modal Créer */}
      <Modal visible={showCreate} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>🎮 Créer un salon</Text>
            <Text style={styles.modalSub}>Un code sera généré pour inviter tes amis</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nom du salon"
              placeholderTextColor="#666"
              value={roomName}
              onChangeText={setRoomName}
              maxLength={30}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowCreate(false); setRoomName(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleCreate}
                disabled={processing}
              >
                {processing ? <ActivityIndicator color="#000" size="small" /> : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#000" />
                    <Text style={styles.modalBtnSaveText}>Créer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Rejoindre */}
      <Modal visible={showJoin} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>🚪 Rejoindre</Text>
            <Text style={styles.modalSub}>Entre le code reçu de ton ami</Text>
            <TextInput
              style={[styles.modalInput, styles.codeInput]}
              placeholder="GP-XXXXX"
              placeholderTextColor="#666"
              value={joinCode}
              onChangeText={(t) => setJoinCode(t.toUpperCase())}
              autoCapitalize="characters"
              maxLength={8}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => { setShowJoin(false); setJoinCode(''); }}
              >
                <Text style={styles.modalBtnCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnSave]}
                onPress={handleJoin}
                disabled={processing}
              >
                {processing ? <ActivityIndicator color="#000" size="small" /> : (
                  <>
                    <Ionicons name="enter" size={18} color="#000" />
                    <Text style={styles.modalBtnSaveText}>Rejoindre</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { color: '#666', fontSize: 18, marginTop: 15, fontWeight: '600' },
  emptySubtext: { color: '#444', fontSize: 13, marginTop: 5, textAlign: 'center' },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  actionBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  actionBtnCreate: { backgroundColor: '#39FF14' },
  actionBtnJoin: {
    backgroundColor: '#1c1c1c',
    borderWidth: 1, borderColor: '#39FF14',
  },
  actionBtnText: { color: '#000', fontSize: 14, fontWeight: 'bold' },

  sectionTitle: {
    color: '#39FF14', fontSize: 13, fontWeight: 'bold',
    marginBottom: 10, letterSpacing: 0.5,
  },

  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#171717', padding: 14, borderRadius: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#262626',
  },
  roomIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#39FF1422',
    borderWidth: 1.5, borderColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center',
  },
  roomInfo: { flex: 1 },
  roomName: { color: '#fff', fontSize: 15, fontWeight: '700' },
  roomMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  roomCode: { color: '#39FF14', fontSize: 11, fontWeight: 'bold' },
  roomSep: { color: '#444', fontSize: 11 },
  roomMembers: { color: '#666', fontSize: 11 },

  modalOverlay: {
    flex: 1, backgroundColor: '#000000CC',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  modal: {
    backgroundColor: '#111', borderRadius: 20, padding: 20,
    width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: '#333',
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  modalSub: { color: '#666', fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 20 },
  modalInput: {
    backgroundColor: '#1c1c1c', color: '#fff',
    paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#333', fontSize: 15, marginBottom: 15,
  },
  codeInput: {
    textAlign: 'center', fontSize: 22, fontWeight: 'bold',
    letterSpacing: 3, color: '#39FF14', borderColor: '#39FF14',
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
  },
  modalBtnCancel: { backgroundColor: '#1c1c1c', borderWidth: 1, borderColor: '#333' },
  modalBtnSave: { backgroundColor: '#39FF14' },
  modalBtnCancelText: { color: '#888', fontSize: 14, fontWeight: '600' },
  modalBtnSaveText: { color: '#000', fontSize: 14, fontWeight: 'bold' },
});
