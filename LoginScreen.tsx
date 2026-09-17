import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithGoogle } from './authConfig';

interface LoginScreenProps {
  onLogin: (user: { email: string; isSignup: boolean; google?: boolean; name?: string | null }) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [isSignup, setIsSignup] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [secure, setSecure] = useState<boolean>(true);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    setGoogleLoading(false);

    if (result.success && result.user) {
      Alert.alert("✅ Connecté", `Bienvenue ${result.user.name || result.user.email} !`);
      onLogin({
        email: result.user.email || '',
        isSignup: false,
        google: true,
        name: result.user.name,
      });
    } else if (result.error) {
      Alert.alert("❌ Erreur Google", result.error);
    }
  };

  const handleSubmit = () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Remplis tous les champs !");
      return;
    }
    if (isSignup && password !== confirm) {
      Alert.alert("Erreur", "Les mots de passe ne correspondent pas !");
      return;
    }
    onLogin({ email, isSignup });
  };

  return (
    <LinearGradient
      colors={['#0a0a0a', '#1a1a1a', '#2b2b2b']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex1}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoBox}>
            <View style={styles.iconCircle}>
              <Ionicons name="pulse" size={42} color="#39FF14" />
            </View>
            <Text style={styles.title}>GoalPulse</Text>
            <Text style={styles.subtitle}>
              {isSignup ? "Crée ton compte" : "Content de te revoir"}
            </Text>
          </View>

          <View style={styles.inputBox}>
            <MaterialIcons name="email" size={22} color="#39FF14" style={styles.inputIcon} />
            <TextInput
              placeholder="Email"
              placeholderTextColor="#888"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputBox}>
            <Ionicons name="lock-closed" size={22} color="#39FF14" style={styles.inputIcon} />
            <TextInput
              placeholder="Mot de passe"
              placeholderTextColor="#888"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
            />
            <TouchableOpacity onPress={() => setSecure(!secure)}>
              <Ionicons name={secure ? "eye-off" : "eye"} size={22} color="#39FF14" />
            </TouchableOpacity>
          </View>

          {isSignup && (
            <View style={styles.inputBox}>
              <Ionicons name="shield-checkmark" size={22} color="#39FF14" style={styles.inputIcon} />
              <TextInput
                placeholder="Confirmer mot de passe"
                placeholderTextColor="#888"
                style={styles.input}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry={secure}
              />
            </View>
          )}

          <TouchableOpacity style={styles.mainBtn} onPress={handleSubmit} activeOpacity={0.8}>
            <Ionicons name={isSignup ? "person-add" : "log-in"} size={22} color="#000" />
            <Text style={styles.mainBtnText}>
              {isSignup ? "Créer mon compte" : "Se connecter"}
            </Text>
          </TouchableOpacity>

          <View style={styles.separator}>
            <View style={styles.line} />
            <Text style={styles.sepText}>ou continuer avec</Text>
            <View style={styles.line} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            activeOpacity={0.8}
            onPress={handleGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#39FF14" />
            ) : (
              <>
                <Ionicons name="logo-google" size={22} color="#39FF14" />
                <Text style={styles.googleBtnText}>Continuer avec Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignup(!isSignup)} style={styles.switchBox}>
            <Text style={styles.switchText}>
              {isSignup ? "Déjà un compte ? " : "Pas encore de compte ? "}
              <Text style={styles.switchLink}>
                {isSignup ? "Se connecter" : "S'inscrire"}
              </Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { flex: 1, minHeight: '100%' as any },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 25 },

  logoBox: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: '#111',
    borderWidth: 2, borderColor: '#39FF14',
    justifyContent: 'center', alignItems: 'center',
    boxShadow: '0px 0px 15px rgba(57, 255, 20, 0.8)',
  },
  title: { fontSize: 34, fontWeight: 'bold', color: '#fff', marginTop: 15, letterSpacing: 1 },
  subtitle: { fontSize: 15, color: '#39FF14', marginTop: 5 },

  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1c1c1c', borderRadius: 12, paddingHorizontal: 15,
    marginBottom: 15, borderWidth: 1, borderColor: '#333',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#fff', paddingVertical: 15, fontSize: 16 },

  mainBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#39FF14', paddingVertical: 16, borderRadius: 12,
    marginTop: 10, boxShadow: '0px 0px 12px rgba(57, 255, 20, 0.6)',
  },
  mainBtnText: { color: '#000', fontSize: 17, fontWeight: 'bold', marginLeft: 8, letterSpacing: 0.5 },

  separator: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  line: { flex: 1, height: 1, backgroundColor: '#333' },
  sepText: { color: '#888', marginHorizontal: 10, fontSize: 13 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#1c1c1c', paddingVertical: 15, borderRadius: 12,
    borderWidth: 1, borderColor: '#39FF14',
    boxShadow: '0px 0px 10px rgba(57, 255, 20, 0.3)',
  },
  googleBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 10, letterSpacing: 0.3 },

  switchBox: { marginTop: 30, alignItems: 'center' },
  switchText: { color: '#aaa', fontSize: 14 },
  switchLink: { color: '#39FF14', fontWeight: 'bold' },
});
