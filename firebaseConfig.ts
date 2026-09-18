import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getFirestore, Firestore } from 'firebase/firestore';
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
// @ts-ignore - getReactNativePersistence existe dans firebase v12 mais pas dans les types
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyC-VXWuusjE6CT1fJDF_HmKFFNm-5O2KtA",
  authDomain: "goalpulse-app-b000c.firebaseapp.com",
  databaseURL: "https://goalpulse-app-b000c-default-rtdb.firebaseio.com",
  projectId: "goalpulse-app-b000c",
  storageBucket: "goalpulse-app-b000c.firebasestorage.app",
  messagingSenderId: "690178162890",
  appId: "1:690178162890:android:3da4155fed43e3b5803433"
};

const app: FirebaseApp = initializeApp(firebaseConfig);

// 🔐 Auth avec persistance (reste connecté entre les sessions)
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
  console.log('✅ Auth avec persistance AsyncStorage');
} catch (e: any) {
  auth = getAuth(app);
  console.log('ℹ️ Auth déjà initialisé');
}

export const database: Database = getDatabase(app);
export const firestore: Firestore = getFirestore(app);
export { auth };
export default app;
