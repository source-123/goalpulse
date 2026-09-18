import { ref, get, set, update, onValue } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';

// ===========================
// 🏅 DÉFINITIONS DES BADGES
// ===========================
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
}

export const ALL_BADGES: Badge[] = [
  // 🥉 BRONZE
  { id: 'first_bet', name: 'Premier pas', description: 'Premier pari placé', icon: '🎯', color: '#CD7F32', tier: 'bronze' },
  { id: 'five_bets', name: 'Apprenti', description: '5 paris placés', icon: '📈', color: '#CD7F32', tier: 'bronze' },
  { id: 'joined_room', name: 'Sociable', description: 'Rejoint un salon', icon: '🚪', color: '#CD7F32', tier: 'bronze' },
  { id: 'created_room', name: 'Organisateur', description: 'Créé un salon', icon: '👑', color: '#CD7F32', tier: 'bronze' },

  // 🥈 SILVER
  { id: 'ten_bets', name: 'Régulier', description: '10 paris placés', icon: '📊', color: '#C0C0C0', tier: 'silver' },
  { id: 'first_correct', name: 'Touché !', description: 'Premier pari réussi', icon: '✅', color: '#C0C0C0', tier: 'silver' },
  { id: 'three_correct', name: 'En feu', description: '3 paris réussis', icon: '🔥', color: '#C0C0C0', tier: 'silver' },
  { id: 'five_rooms', name: 'Populaire', description: 'Membre de 5 salons', icon: '🎉', color: '#C0C0C0', tier: 'silver' },

  // 🥇 GOLD
  { id: 'first_exact', name: 'Sniper', description: 'Premier score exact', icon: '🎯', color: '#FFD700', tier: 'gold' },
  { id: 'five_exact', name: 'Œil de lynx', description: '5 scores exacts', icon: '👁️', color: '#FFD700', tier: 'gold' },
  { id: 'fifty_points', name: 'Champion', description: '50 points au total', icon: '🏆', color: '#FFD700', tier: 'gold' },
  { id: 'streak_5', name: 'Invincible', description: '5 jours consécutifs', icon: '⚡', color: '#FFD700', tier: 'gold' },

  // 💎 PLATINUM
  { id: 'hundred_points', name: 'Légende', description: '100 points au total', icon: '💎', color: '#00CED1', tier: 'platinum' },
  { id: 'ten_exact', name: 'Oracle', description: '10 scores exacts', icon: '🔮', color: '#00CED1', tier: 'platinum' },
  { id: 'rank_1', name: 'Numéro 1', description: 'Premier dans un salon', icon: '🥇', color: '#00CED1', tier: 'platinum' },
  { id: 'all_badges', name: 'Maître GoalPulse', description: 'Tous les badges', icon: '👑', color: '#39FF14', tier: 'platinum' },
];

// ===========================
// 👤 NIVEAUX
// ===========================
export interface Level {
  level: number;
  name: string;
  minPoints: number;
  color: string;
  icon: string;
}

export const LEVELS: Level[] = [
  { level: 1, name: 'Débutant', minPoints: 0, color: '#666', icon: '🌱' },
  { level: 2, name: 'Amateur', minPoints: 20, color: '#CD7F32', icon: '⚽' },
  { level: 3, name: 'Passionné', minPoints: 50, color: '#C0C0C0', icon: '🥅' },
  { level: 4, name: 'Expert', minPoints: 100, color: '#FFD700', icon: '🏅' },
  { level: 5, name: 'Maître', minPoints: 200, color: '#FF6B6B', icon: '🏆' },
  { level: 6, name: 'Légende', minPoints: 400, color: '#9D4EDD', icon: '💎' },
  { level: 7, name: 'GOAT', minPoints: 800, color: '#39FF14', icon: '🐐' },
];

export const getLevelFromPoints = (points: number): Level => {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (points >= l.minPoints) current = l;
    else break;
  }
  return current;
};

export const getNextLevel = (points: number): Level | null => {
  for (const l of LEVELS) {
    if (points < l.minPoints) return l;
  }
  return null;
};

// ===========================
// 🏅 SAVE BADGE
// ===========================
export const unlockBadge = async (
  userEmail: string,
  badgeId: string
): Promise<boolean> => {
  const userKey = getUserKey(userEmail);
  const badgeRef = ref(database, `users/${userKey}/badges/${badgeId}`);

  try {
    const snap = await get(badgeRef);
    if (snap.exists()) return false; // Déjà débloqué

    await set(badgeRef, {
      badgeId,
      unlockedAt: Date.now(),
    });
    console.log(`🏅 Badge débloqué: ${badgeId}`);
    return true;
  } catch (e) {
    console.error('Erreur unlockBadge:', e);
    return false;
  }
};

// ===========================
// 📋 LISTENER BADGES
// ===========================
export const subscribeUserBadges = (
  userEmail: string,
  callback: (badgeIds: string[]) => void
) => {
  const userKey = getUserKey(userEmail);
  const badgesRef = ref(database, `users/${userKey}/badges`);

  return onValue(
    badgesRef,
    (snap) => {
      const data = snap.val();
      callback(data ? Object.keys(data) : []);
    },
    () => callback([])
  );
};

// ===========================
// 🎯 VÉRIFIER ET DÉBLOQUER LES BADGES
// ===========================
export const checkAndUnlockBadges = async (
  userEmail: string
): Promise<string[]> => {
  const userKey = getUserKey(userEmail);
  const unlocked: string[] = [];

  try {
    // Récupérer les stats
    const predsSnap = await get(ref(database, `users/${userKey}/predictions`));
    const roomsSnap = await get(ref(database, `rooms`));
    const profileSnap = await get(ref(database, `users/${userKey}/profile`));

    const preds = predsSnap.val() || {};
    const predList = Object.values(preds) as any[];
    const rooms = roomsSnap.val() || {};
    const profile = profileSnap.val() || {};

    // Compter
    const totalBets = predList.length;
    const correctBets = predList.filter((p: any) => p.points > 0).length;
    const exactBets = predList.filter((p: any) => p.points === 5).length;
    const totalPoints = predList.reduce((s: number, p: any) => s + (p.points || 0), 0);

    // Rooms
    let joinedRooms = 0;
    let createdRooms = 0;
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];
      if (room.members && room.members[userKey]) joinedRooms++;
      if (room.info?.createdBy === userKey) createdRooms++;
    });

    // 🎯 Vérifier chaque badge
    const checks: Array<[string, boolean]> = [
      ['first_bet', totalBets >= 1],
      ['five_bets', totalBets >= 5],
      ['ten_bets', totalBets >= 10],
      ['joined_room', joinedRooms >= 1],
      ['created_room', createdRooms >= 1],
      ['five_rooms', joinedRooms >= 5],
      ['first_correct', correctBets >= 1],
      ['three_correct', correctBets >= 3],
      ['first_exact', exactBets >= 1],
      ['five_exact', exactBets >= 5],
      ['ten_exact', exactBets >= 10],
      ['fifty_points', totalPoints >= 50],
      ['hundred_points', totalPoints >= 100],
    ];

    // Débloquer
    for (const [id, condition] of checks) {
      if (condition) {
        const isNew = await unlockBadge(userEmail, id);
        if (isNew) unlocked.push(id);
      }
    }

    // 👑 Badge ultime : tous les autres débloqués
    if (unlocked.length + (Object.keys(preds).length > 0 ? 1 : 0) >= 13) {
      const isNew = await unlockBadge(userEmail, 'all_badges');
      if (isNew) unlocked.push('all_badges');
    }
  } catch (e) {
    console.error('Erreur checkBadges:', e);
  }

  return unlocked;
};
