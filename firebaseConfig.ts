import { initializeApp, FirebaseApp } from 'firebase/app';
import { getDatabase, Database } from 'firebase/database';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDv4yzuiRR5CRg1b5wUcRFZyUhAJndxtYA",
  authDomain: "goalpulse-app-b000c.firebaseapp.com",
  databaseURL: "https://goalpulse-app-b000c-default-rtdb.firebaseio.com",
  projectId: "goalpulse-app-b000c",
  storageBucket: "goalpulse-app-b000c.firebasestorage.app",
  messagingSenderId: "690178162890",
  appId: "1:690178162890:android:3da4155fed43e3b5803433"
};

const app: FirebaseApp = initializeApp(firebaseConfig);
export const database: Database = getDatabase(app);
export const firestore: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export default app;
