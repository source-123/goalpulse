import { ref, push, set, onValue, remove, query, limitToLast } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';

// ===========================
// 📦 TYPES
// ===========================
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  type?: 'text' | 'system' | 'bet';
  matchId?: string;
}

// ===========================
// 💬 ENVOYER UN MESSAGE
// ===========================
export const sendChatMessage = async (
  code: string,
  userEmail: string,
  userName: string,
  text: string,
  type: 'text' | 'system' | 'bet' = 'text',
  matchId?: string
): Promise<void> => {
  if (!text.trim()) return;

  try {
    const myKey = getUserKey(userEmail);
    const chatRef = ref(database, `rooms/${code}/chat`);
    const newRef = push(chatRef);

    await set(newRef, {
      userId: myKey,
      userName,
      text: text.trim(),
      createdAt: Date.now(),
      type,
      matchId: matchId || null,
    });

    console.log('💬 Message envoyé');
  } catch (e: any) {
    console.error('❌ Erreur sendChat:', e.message);
  }
};

// ===========================
// 📡 ÉCOUTER LES MESSAGES (temps réel)
// ===========================
export const subscribeChatMessages = (
  code: string,
  callback: (messages: ChatMessage[]) => void
) => {
  // Récupérer les 100 derniers messages
  const chatRef = query(
    ref(database, `rooms/${code}/chat`),
    limitToLast(100)
  );

  return onValue(
    chatRef,
    (snap) => {
      const data = snap.val();
      if (!data) {
        callback([]);
        return;
      }
      const list: ChatMessage[] = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
      }));
      // Trier par date croissante (plus ancien → plus récent)
      list.sort((a, b) => a.createdAt - b.createdAt);
      callback(list);
    },
    (error) => {
      console.error('❌ Erreur chat:', error.message);
      callback([]);
    }
  );
};

// ===========================
// 🗑️ SUPPRIMER UN MESSAGE
// ===========================
export const deleteChatMessage = async (
  code: string,
  messageId: string
): Promise<void> => {
  try {
    await remove(ref(database, `rooms/${code}/chat/${messageId}`));
  } catch (e: any) {
    console.error('❌ Erreur delete message:', e.message);
  }
};

// ===========================
// 🕐 FORMAT AGE
// ===========================
export const formatMessageTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};
