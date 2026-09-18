import { ref, onValue, set, get, update, remove } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';
import { isFinishedStatus } from './liveScoreService';

export interface Prediction {
  matchId: string;
  homeScore: number;
  awayScore: number;
  matchInfo: {
    localteam: string;
    visitorteam: string;
    leaguename: string;
    date: string;
    time: string;
    scoretime: string; // score actuel
    status: string;
  };
  createdAt: number;
  points: number; // points calculés
  status: 'pending' | 'correct' | 'wrong';
}

// 📋 Écouter mes pronostics
export const subscribeMyPredictions = (
  myEmail: string,
  callback: (preds: Prediction[]) => void
) => {
  const myKey = getUserKey(myEmail);
  const ref_ = ref(database, `users/${myKey}/predictions`);

  return onValue(ref_, (snap) => {
    const data = snap.val();
    if (!data) {
      callback([]);
      return;
    }
    const list: Prediction[] = Object.keys(data).map((key) => ({
      matchId: key,
      ...data[key],
    }));
    // Trier par date desc
    list.sort((a, b) => b.createdAt - a.createdAt);
    callback(list);
  });
};

// ➕ Ajouter/Modifier un pronostic
export const savePrediction = async (
  myEmail: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
  matchInfo: Prediction['matchInfo']
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  await set(ref(database, `users/${myKey}/predictions/${matchId}`), {
    homeScore,
    awayScore,
    matchInfo,
    createdAt: Date.now(),
    points: 0,
    status: 'pending',
  });
};

// 🗑️ Supprimer un pronostic
export const deletePrediction = async (
  myEmail: string,
  matchId: string
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  await remove(ref(database, `users/${myKey}/predictions/${matchId}`));
};

// 📊 Calculer les points d'un pronostic
export const calculatePoints = (
  pred: { homeScore: number; awayScore: number },
  actual: { homeScore: number; awayScore: number }
): number => {
  // Score exact = 5 pts
  if (pred.homeScore === actual.homeScore && pred.awayScore === actual.awayScore) {
    return 5;
  }

  const predDiff = pred.homeScore - pred.awayScore;
  const actualDiff = actual.homeScore - actual.awayScore;

  // Bon vainqueur + bon écart = 3 pts
  if (Math.sign(predDiff) === Math.sign(actualDiff) && predDiff === actualDiff) {
    return 3;
  }

  // Bon vainqueur = 1 pt
  if (Math.sign(predDiff) === Math.sign(actualDiff)) {
    return 1;
  }

  return 0;
};

// 🔄 Recalculer les points d'un pronostic (après fin de match)
export const updatePredictionPoints = async (
  myEmail: string,
  matchId: string,
  actualScore: { homeScore: number; awayScore: number }
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  const predRef = ref(database, `users/${myKey}/predictions/${matchId}`);
  const snap = await get(predRef);
  if (!snap.exists()) return;

  const pred = snap.val();
  const points = calculatePoints(
    { homeScore: pred.homeScore, awayScore: pred.awayScore },
    actualScore
  );

  await update(predRef, {
    points,
    status: points > 0 ? 'correct' : 'wrong',
  });
};

// 🏆 Récupérer les points totaux d'un utilisateur
export const getTotalPoints = async (userKey: string): Promise<number> => {
  const snap = await get(ref(database, `users/${userKey}/predictions`));
  if (!snap.exists()) return 0;
  const data = snap.val();
  return Object.values(data).reduce(
    (sum: number, p: any) => sum + (p.points || 0),
    0
  );
};

// 💾 Mettre à jour le total dans le profil
export const syncUserPoints = async (myEmail: string): Promise<void> => {
  const myKey = getUserKey(myEmail);
  const total = await getTotalPoints(myKey);
  await update(ref(database, `users/${myKey}/profile`), {
    points: total,
  });
};
