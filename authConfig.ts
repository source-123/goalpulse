import { Platform } from 'react-native';
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

// Configuration Google Sign-In (mobile uniquement)
let GoogleSignin: any = null;
if (Platform.OS !== 'web') {
  try {
    const gsi = require('@react-native-google-signin/google-signin');
    GoogleSignin = gsi.GoogleSignin;
    GoogleSignin.configure({
      webClientId: '690178162890-rtfdf6gh92e4ivk9p41p8aidpnvihcrc.apps.googleusercontent.com',
      offlineAccess: false,
      scopes: ['email', 'profile'],
      forceCodeForRefreshToken: true,
    });
    console.log('✅ GoogleSignin configuré');
  } catch (e) {
    console.warn("GoogleSignin non disponible:", e);
  }
}

export interface GoogleUser {
  uid: string;
  email: string | null;
  name: string | null;
  photo: string | null;
}

export interface AuthResult {
  success: boolean;
  user?: GoogleUser;
  error?: string;
}

export const signInWithGoogle = async (): Promise<AuthResult> => {
  try {
    // 🌐 WEB : Utiliser signInWithPopup (Firebase)
    if (Platform.OS === 'web') {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return {
        success: true,
        user: {
          uid: result.user.uid,
          email: result.user.email,
          name: result.user.displayName,
          photo: result.user.photoURL,
        },
      };
    }

    // 📱 MOBILE : Utiliser @react-native-google-signin
    if (!GoogleSignin) {
      return { success: false, error: "GoogleSignin non disponible" };
    }

    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Déconnexion préalable pour éviter les conflits de cache
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Ignore si pas connecté
    }

    // Lance la connexion
    const response: any = await GoogleSignin.signIn();

    console.log('📦 Réponse Google brute:', JSON.stringify(response, null, 2));

    // ⚠️ NOUVEAU : la structure change selon la version
    // v13+ : response.data.idToken
    // v12- : response.idToken
    const idToken =
      response?.data?.idToken ||
      response?.idToken ||
      null;

    if (!idToken) {
      console.error('❌ Réponse sans idToken:', response);
      return {
        success: false,
        error: "Pas de token reçu de Google. Vérifie ta config (SHA-1, Web Client ID)."
      };
    }

    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);

    return {
      success: true,
      user: {
        uid: result.user.uid,
        email: result.user.email,
        name: result.user.displayName,
        photo: result.user.photoURL,
      },
    };
  } catch (error: any) {
    console.error("Erreur Google:", error);
    return { success: false, error: error.message || "Erreur inconnue" };
  }
};

export const logout = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (Platform.OS !== 'web' && GoogleSignin) {
      try { await GoogleSignin.signOut(); } catch (e) {}
    }
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
