import { ref, onValue, set, remove } from 'firebase/database';
import { database } from './firebaseConfig';

// 🔐 Clé utilisateur
const getUserKey = (email: string) => email.replace(/[.@]/g, '_');

// ⭐ Écouter les favoris d'un utilisateur
export const subscribeFavorites = (
  email: string,
  callback: (favorites: string[]) => void
) => {
  const userKey = getUserKey(email);
  const favRef = ref(database, `users/${userKey}/favorites`);

  return onValue(favRef, (snapshot) => {
    const data = snapshot.val();
    callback(data ? Object.keys(data) : []);
  });
};

// ⭐ Ajouter un favori
export const addFavorite = async (email: string, teamName: string) => {
  const userKey = getUserKey(email);
  const favRef = ref(database, `users/${userKey}/favorites/${teamName.replace(/[.#$/\[\]]/g, '_')}`);
  await set(favRef, { name: teamName, addedAt: Date.now() });
};

// ⭐ Retirer un favori
export const removeFavorite = async (email: string, teamName: string) => {
  const userKey = getUserKey(email);
  const favRef = ref(database, `users/${userKey}/favorites/${teamName.replace(/[.#$/\[\]]/g, '_')}`);
  await remove(favRef);
};

// 🔄 Toggle favori
export const toggleFavorite = async (
  email: string,
  teamName: string,
  isFavorite: boolean
) => {
  if (isFavorite) {
    await removeFavorite(email, teamName);
  } else {
    await addFavorite(email, teamName);
  }
};
