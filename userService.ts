import { ref, set, get } from 'firebase/database';
import { database } from './firebaseConfig';

// 🔐 Clé utilisateur (remplace . et @)
export const getUserKey = (email: string): string =>
  email.replace(/[.@]/g, '_');

// 💾 Sauvegarde le profil dans userLookup (permet de se faire ajouter par email)
export const saveUserProfile = async (
  email: string,
  displayName: string | null
): Promise<void> => {
  const userKey = getUserKey(email);
  const name = displayName || email.split('@')[0];

  // 1. Sauvegarder dans le profil privé
  await set(ref(database, `users/${userKey}/profile`), {
    email,
    displayName: name,
    createdAt: Date.now(),
  });

  // 2. Sauvegarder dans l'annuaire public (pour recherche par email)
  await set(ref(database, `userLookup/${userKey}`), {
    email,
    displayName: name,
  });

  console.log('✅ Profil sauvegardé:', userKey);
};

// 🔍 Trouve un utilisateur par email
export const findUserByEmail = async (
  email: string
): Promise<{ email: string; displayName: string; userKey: string } | null> => {
  const userKey = getUserKey(email);
  const snap = await get(ref(database, `userLookup/${userKey}`));

  if (!snap.exists()) return null;

  const data = snap.val();
  return {
    userKey,
    email: data.email,
    displayName: data.displayName,
  };
};

// 📊 Récupère le profil d'un utilisateur
export const getUserProfile = async (email: string): Promise<any> => {
  const userKey = getUserKey(email);
  const snap = await get(ref(database, `users/${userKey}/profile`));
  return snap.exists() ? snap.val() : null;
};
