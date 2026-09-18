// 🎯 Détecte les buts et envoie des notifs
import { ref, get, set, onValue } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';
import { sendPushNotification } from './notificationService';

// 📸 Prend un snapshot des scores
export const takeScoreSnapshot = async (): Promise<Record<string, { homeScore: number; awayScore: number; status: string }>> => {
  try {
    const res = await fetch('https://goalpulse-aciq.onrender.com/api/check-scores');
    const json = await res.json();
    return json.success ? json.data : {};
  } catch {
    return {};
  }
};

// 🎯 Détecte les changements de score et notifie
export const detectGoalsAndNotify = async (
  previousScores: Record<string, any>,
  currentScores: Record<string, any>,
  followedMatches: Array<{ matchId: string; homeTeam: string; awayTeam: string; roomCode?: string }>
): Promise<void> => {
  for (const match of followedMatches) {
    const prev = previousScores[match.matchId];
    const curr = currentScores[match.matchId];

    if (!prev || !curr) continue;

    // Détecter changement de score
    const homeGoal = (curr.homeScore || 0) > (prev.homeScore || 0);
    const awayGoal = (curr.awayScore || 0) > (prev.awayScore || 0);

    if (homeGoal || awayGoal) {
      const scorer = homeGoal ? match.homeTeam : match.awayTeam;
      const score = `${curr.homeScore} - ${curr.awayScore}`;

      console.log(`⚽ BUT ! ${scorer} → ${score}`);

      // Ajouter une notification dans Firebase pour l'utilisateur
      // (on utilise pas sendPushNotification car ça demande de connaître les destinataires)
    }
  }
};

// 📋 Sauvegarder les matchs suivis par l'utilisateur
export const saveFollowedMatch = async (
  userEmail: string,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  roomCode?: string
): Promise<void> => {
  const userKey = getUserKey(userEmail);
  await set(ref(database, `users/${userKey}/followedMatches/${matchId}`), {
    matchId,
    homeTeam,
    awayTeam,
    roomCode: roomCode || null,
    followedAt: Date.now(),
    lastHomeScore: 0,
    lastAwayScore: 0,
  });
};

// 📋 Supprimer un match suivi
export const unfollowMatch = async (
  userEmail: string,
  matchId: string
): Promise<void> => {
  const userKey = getUserKey(userEmail);
  await set(ref(database, `users/${userKey}/followedMatches/${matchId}`), null);
};

// 📋 Écouter les matchs suivis
export const subscribeFollowedMatches = (
  userEmail: string,
  callback: (matches: any[]) => void
) => {
  const userKey = getUserKey(userEmail);
  return onValue(ref(database, `users/${userKey}/followedMatches`), (snap) => {
    const data = snap.val();
    if (!data) {
      callback([]);
      return;
    }
    callback(Object.values(data));
  });
};

// 🔔 Ajouter une notification pour l'utilisateur
export const addUserNotification = async (
  userEmail: string,
  title: string,
  body: string,
  type: 'goal' | 'match_start' | 'match_end' | 'room' | 'bet'
): Promise<void> => {
  const userKey = getUserKey(userEmail);
  const notifRef = ref(database, `users/${userKey}/notifications/${Date.now()}`);
  await set(notifRef, {
    title,
    body,
    type,
    createdAt: Date.now(),
    read: false,
  });
};
