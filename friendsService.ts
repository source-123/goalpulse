import { ref, onValue, set, remove, get } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';

export interface Friend {
  userKey: string;
  email: string;
  displayName: string;
  addedAt: number;
}

// 📋 Écouter la liste d'amis en temps réel
export const subscribeFriends = (
  myEmail: string,
  callback: (friends: Friend[]) => void
) => {
  const myKey = getUserKey(myEmail);
  const friendsRef = ref(database, `users/${myKey}/friends`);

  return onValue(friendsRef, (snap) => {
    const data = snap.val();
    if (!data) {
      callback([]);
      return;
    }
    const list: Friend[] = Object.keys(data).map((key) => ({
      userKey: key,
      email: data[key].email || '',
      displayName: data[key].displayName || 'Ami',
      addedAt: data[key].addedAt || 0,
    }));
    // Trier par nom
    list.sort((a, b) => a.displayName.localeCompare(b.displayName));
    callback(list);
  });
};

// ➕ Ajouter un ami
export const addFriend = async (
  myEmail: string,
  friendEmail: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Vérifier que l'ami existe
    const friendKey = getUserKey(friendEmail);
    const friendSnap = await get(ref(database, `userLookup/${friendKey}`));

    if (!friendSnap.exists()) {
      return {
        success: false,
        error: 'Utilisateur introuvable. Il doit d\'abord se connecter à GoalPulse.',
      };
    }

    // Vérifier qu'on ne s'ajoute pas soi-même
    if (friendEmail.toLowerCase() === myEmail.toLowerCase()) {
      return { success: false, error: 'Tu ne peux pas t\'ajouter toi-même 😄' };
    }

    // Vérifier qu'il n'est pas déjà ami
    const myKey = getUserKey(myEmail);
    const existing = await get(
      ref(database, `users/${myKey}/friends/${friendKey}`)
    );
    if (existing.exists()) {
      return { success: false, error: 'Déjà dans ta liste d\'amis' };
    }

    const friendData = friendSnap.val();

    // Ajouter l'ami
    await set(ref(database, `users/${myKey}/friends/${friendKey}`), {
      email: friendData.email,
      displayName: friendData.displayName,
      addedAt: Date.now(),
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
};

// 🗑️ Supprimer un ami
export const removeFriend = async (
  myEmail: string,
  friendKey: string
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  await remove(ref(database, `users/${myKey}/friends/${friendKey}`));
};

// 📊 Récupérer les points d'un ami
export const getFriendPoints = async (friendKey: string): Promise<number> => {
  const snap = await get(ref(database, `users/${friendKey}/profile/points`));
  return snap.exists() ? snap.val() : 0;
};
