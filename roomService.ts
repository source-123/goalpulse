import { ref, set, get, onValue, remove, update } from 'firebase/database';
import { database } from './firebaseConfig';
import { getUserKey } from './userService';
import { BetType, calculateBetPoints } from './betTypes';

// ===========================
// 📦 TYPES
// ===========================
export interface Room {
  code: string;
  name: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  members: Record<string, { name: string; joinedAt: number; email: string }>;
}

export interface RoomMember {
  userKey: string;
  name: string;
  email: string;
  joinedAt: number;
  points?: number;
}

export interface RoomPrediction {
  matchId: string;
  betType?: BetType;
  betValue?: string;
  homeScore?: number;
  awayScore?: number;
  createdAt: number;
  points: number;
  status: 'pending' | 'correct' | 'wrong';
  matchInfo: {
    localteam: string;
    visitorteam: string;
    leaguename: string;
    date: string;
    time: string;
    scoretime: string;
    status: string;
  };
}

export interface SelectedMatch {
  matchId: string;
  matchInfo: {
    localteam: string;
    visitorteam: string;
    leaguename: string;
    date: string;
    time: string;
    status: string;
    scoretime: string;
  };
  addedBy: string;
  addedAt: number;
}

export interface CurrentScore {
  homeScore: number;
  awayScore: number;
  status: string;
}

// ===========================
// 🎲 GÉNÉRATION DE CODE
// ===========================
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateCode = (): string => {
  let code = 'GP-';
  for (let i = 0; i < 5; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
};

// ===========================
// 🎮 CRÉER UN SALON
// ===========================
export const createRoom = async (
  myEmail: string,
  myName: string,
  roomName: string
): Promise<{ success: boolean; code?: string; error?: string }> => {
  try {
    let code = '';
    for (let i = 0; i < 10; i++) {
      const testCode = generateCode();
      const existing = await get(ref(database, `rooms/${testCode}/info`));
      if (!existing.exists()) {
        code = testCode;
        break;
      }
    }

    if (!code) {
      return { success: false, error: 'Impossible de générer un code unique' };
    }

    const myKey = getUserKey(myEmail);

    await set(ref(database, `rooms/${code}/info`), {
      code,
      name: roomName,
      createdBy: myKey,
      createdByName: myName,
      createdAt: Date.now(),
    });

    await set(ref(database, `rooms/${code}/members/${myKey}`), {
      name: myName,
      email: myEmail,
      joinedAt: Date.now(),
    });

    console.log('✅ Salon créé:', code);
    return { success: true, code };
  } catch (e: any) {
    console.error('❌ createRoom:', e.message);
    return { success: false, error: e.message };
  }
};

// ===========================
// 🚪 REJOINDRE UN SALON
// ===========================
export const joinRoom = async (
  myEmail: string,
  myName: string,
  code: string
): Promise<{ success: boolean; roomName?: string; error?: string }> => {
  try {
    const cleanCode = code.trim().toUpperCase();
    const roomSnap = await get(ref(database, `rooms/${cleanCode}/info`));

    if (!roomSnap.exists()) {
      return { success: false, error: 'Code invalide. Vérifie et réessaie.' };
    }

    const room = roomSnap.val();
    const myKey = getUserKey(myEmail);

    await set(ref(database, `rooms/${cleanCode}/members/${myKey}`), {
      name: myName,
      email: myEmail,
      joinedAt: Date.now(),
    });

    console.log('✅ Rejoint le salon:', cleanCode);
    return { success: true, roomName: room.name };
  } catch (e: any) {
    console.error('❌ joinRoom:', e.message);
    return { success: false, error: e.message };
  }
};

// ===========================
// 📋 MES SALONS
// ===========================
export const subscribeMyRooms = (
  myEmail: string,
  callback: (rooms: Room[]) => void
) => {
  const myKey = getUserKey(myEmail);
  const roomsRef = ref(database, 'rooms');

  return onValue(
    roomsRef,
    (snap) => {
      const data = snap.val();
      if (!data) {
        callback([]);
        return;
      }

      const myRooms: Room[] = [];
      Object.keys(data).forEach((code) => {
        const room = data[code];
        if (room && room.members && room.members[myKey]) {
          myRooms.push({
            code,
            name: room.info?.name || 'Salon',
            createdBy: room.info?.createdBy || '',
            createdByName: room.info?.createdByName || '',
            createdAt: room.info?.createdAt || 0,
            members: room.members,
          });
        }
      });

      myRooms.sort((a, b) => b.createdAt - a.createdAt);
      callback(myRooms);
    },
    (error) => {
      console.error('❌ Erreur rooms:', error.message);
      callback([]);
    }
  );
};

// ===========================
// 👥 MEMBRES
// ===========================
export const subscribeRoomMembers = (
  code: string,
  callback: (members: RoomMember[]) => void
) => {
  const membersRef = ref(database, `rooms/${code}/members`);
  return onValue(
    membersRef,
    (snap) => {
      const data = snap.val();
      if (!data) {
        callback([]);
        return;
      }
      const list: RoomMember[] = Object.keys(data).map((key) => ({
        userKey: key,
        name: data[key].name || 'Joueur',
        email: data[key].email || '',
        joinedAt: data[key].joinedAt || 0,
      }));
      callback(list);
    },
    () => callback([])
  );
};

// ===========================
// ⭐ MATCHS SÉLECTIONNÉS
// ===========================
export const addMatchToRoom = async (
  code: string,
  myEmail: string,
  matchId: string,
  matchInfo: SelectedMatch['matchInfo']
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  await set(ref(database, `rooms/${code}/selectedMatches/${matchId}`), {
    matchId,
    matchInfo,
    addedBy: myKey,
    addedAt: Date.now(),
  });
};

export const removeMatchFromRoom = async (
  code: string,
  matchId: string
): Promise<void> => {
  await remove(ref(database, `rooms/${code}/selectedMatches/${matchId}`));
};

export const subscribeRoomSelectedMatches = (
  code: string,
  callback: (matches: SelectedMatch[]) => void
) => {
  const ref_ = ref(database, `rooms/${code}/selectedMatches`);
  return onValue(
    ref_,
    (snap) => {
      const data = snap.val();
      if (!data) {
        callback([]);
        return;
      }
      const list: SelectedMatch[] = Object.keys(data).map((key) => ({
        matchId: key,
        ...data[key],
      }));
      list.sort((a, b) => b.addedAt - a.addedAt);
      callback(list);
    },
    () => callback([])
  );
};

// ===========================
// 🎯 PRONOSTICS
// ===========================
export const subscribeRoomPredictions = (
  code: string,
  callback: (preds: Record<string, Record<string, RoomPrediction>>) => void
) => {
  const ref_ = ref(database, `rooms/${code}/predictions`);
  return onValue(
    ref_,
    (snap) => {
      callback(snap.val() || {});
    },
    () => callback({})
  );
};

export const saveRoomPrediction = async (
  code: string,
  myEmail: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
  matchInfo: RoomPrediction['matchInfo']
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  await set(ref(database, `rooms/${code}/predictions/${myKey}/${matchId}`), {
    matchId,
    betType: 'exact_score',
    betValue: null,
    homeScore,
    awayScore,
    createdAt: Date.now(),
    points: 0,
    status: 'pending',
    matchInfo,
  });
};

// 🎰 PARIS SPÉCIAUX
export const saveAdvancedPrediction = async (
  code: string,
  myEmail: string,
  matchId: string,
  betType: BetType,
  betValue: string | undefined,
  homeScore: number | undefined,
  awayScore: number | undefined,
  matchInfo: RoomPrediction['matchInfo']
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  await set(ref(database, `rooms/${code}/predictions/${myKey}/${matchId}`), {
    matchId,
    betType,
    betValue: betValue || null,
    homeScore: homeScore ?? null,
    awayScore: awayScore ?? null,
    createdAt: Date.now(),
    points: 0,
    status: 'pending',
    matchInfo,
  });
  console.log('✅ Pari enregistré:', betType);
};

export const deleteUserPrediction = async (
  code: string,
  myEmail: string,
  matchId: string
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  await remove(ref(database, `rooms/${code}/predictions/${myKey}/${matchId}`));
};

// ===========================
// 📊 CALCUL DES POINTS
// ===========================
export const calculatePoints = (
  pred: { homeScore: number; awayScore: number },
  actual: { homeScore: number; awayScore: number }
): number => {
  if (pred.homeScore === actual.homeScore && pred.awayScore === actual.awayScore) {
    return 5;
  }
  const predDiff = pred.homeScore - pred.awayScore;
  const actualDiff = actual.homeScore - actual.awayScore;
  if (predDiff === actualDiff) return 3;
  if (Math.sign(predDiff) === Math.sign(actualDiff)) return 1;
  return 0;
};

export const updateRoomPredictionPoints = async (
  code: string,
  userKey: string,
  matchId: string,
  actualScore: { homeScore: number; awayScore: number }
): Promise<void> => {
  const predRef = ref(database, `rooms/${code}/predictions/${userKey}/${matchId}`);
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

// ===========================
// 🎯 SCORES ACTUELS
// ===========================
export const fetchCurrentScores = async (): Promise<
  Record<string, CurrentScore>
> => {
  try {
    const res = await fetch('https://goalpulse-aciq.onrender.com/api/check-scores');
    const json = await res.json();
    return json.success ? json.data : {};
  } catch (err) {
    return {};
  }
};

// ===========================
// 🔄 RECALCULER TOUS LES POINTS
// ===========================
export const recalculateRoomPoints = async (
  code: string,
  predictions: Record<string, Record<string, RoomPrediction>>,
  currentScores: Record<string, CurrentScore>
): Promise<number> => {
  let updated = 0;

  for (const userKey of Object.keys(predictions)) {
    for (const matchId of Object.keys(predictions[userKey])) {
      const pred = predictions[userKey][matchId];
      const actual = currentScores[matchId];

      if (actual && (actual.status === 'FT' || parseInt(actual.status, 10) >= 90)) {
        // Calculer selon le type de pari
        const points = pred.betType && pred.betType !== 'exact_score'
          ? calculateBetPoints(
              {
                type: pred.betType,
                value: pred.betValue,
                homeScore: pred.homeScore,
                awayScore: pred.awayScore,
              },
              actual
            )
          : calculatePoints(
              { homeScore: pred.homeScore || 0, awayScore: pred.awayScore || 0 },
              actual
            );

        if (points !== pred.points) {
          try {
            await update(
              ref(database, `rooms/${code}/predictions/${userKey}/${matchId}`),
              { points, status: points > 0 ? 'correct' : 'wrong' }
            );
            updated++;
          } catch (e) {}
        }
      }
    }
  }
  return updated;
};

// ===========================
// 🗑️ QUITTER / SUPPRIMER
// ===========================
export const leaveRoom = async (
  code: string,
  myEmail: string
): Promise<void> => {
  const myKey = getUserKey(myEmail);
  await remove(ref(database, `rooms/${code}/members/${myKey}`));
  await remove(ref(database, `rooms/${code}/predictions/${myKey}`));
};

export const deleteRoom = async (code: string): Promise<void> => {
  await remove(ref(database, `rooms/${code}`));
};

export const isRoomCreator = async (
  code: string,
  myEmail: string
): Promise<boolean> => {
  try {
    const myKey = getUserKey(myEmail);
    const snap = await get(ref(database, `rooms/${code}/info/createdBy`));
    return snap.exists() && snap.val() === myKey;
  } catch (err) {
    return false;
  }
};

// ===========================
// 🏆 CLASSEMENT
// ===========================
export const computeRoomLeaderboard = (
  members: RoomMember[],
  predictions: Record<string, Record<string, RoomPrediction>>
): Array<RoomMember & { points: number; exactCount: number; totalPreds: number }> => {
  return members
    .map((m) => {
      const userPreds = predictions[m.userKey] || {};
      const predList = Object.values(userPreds);
      const totalPoints = predList.reduce((sum, p) => sum + (p.points || 0), 0);
      const exactCount = predList.filter((p) => p.points === 5).length;
      return {
        ...m,
        points: totalPoints,
        exactCount,
        totalPreds: predList.length,
      };
    })
    .sort((a, b) => b.points - a.points || b.exactCount - a.exactCount);
};
