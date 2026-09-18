import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Image,
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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      setGoogleLoading(false);

      if (result.success && result.user) {
        onLogin({
          email: result.user.email || '',
          isSignup: false,
          google: true,
          name: result.user.name,
        });
      } else if (result.error && !result.error.includes('annulée')) {
        Alert.alert("Erreur Google", result.error);
      }
    } catch (e: any) {
      setGoogleLoading(false);
      Alert.alert("Erreur", e.message || "Impossible d'ouvrir Google");
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
    <View style={styles.root}>
      {/* 🌌 BACKGROUND GRADIENT + GLOW */}
      <LinearGradient
        colors={['#000000', '#0a0f0a', '#000000']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 🎨 LOGO HERO */}
          <View style={styles.hero}>
            <View style={styles.logoGlow}>
              <View style={styles.logoRing}>
                <Image
                  source={require('./assets/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.brand}>GoalPulse</Text>
            <View style={styles.brandUnderline} />
            <Text style={styles.tagline}>
              {isSignup ? 'Rejoins la communauté' : 'Tous les scores en direct'}
            </Text>
          </View>

          {/* 📦 FORM CARD */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {isSignup ? 'Créer un compte' : 'Connexion'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {isSignup ? 'Ça prend 30 secondes' : 'Content de te revoir 👋'}
              </Text>
            </View>

            {/* EMAIL */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <View
                style={[
                  styles.field,
                  focusedField === 'email' && styles.fieldFocused,
                ]}
              >
                <MaterialIcons
                  name="alternate-email"
                  size={20}
                  color={focusedField === 'email' ? '#39FF14' : '#666'}
                />
                <TextInput
                  placeholder="ton@email.com"
                  placeholderTextColor="#4a4a4a"
                  style={styles.fieldInput}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* PASSWORD */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>MOT DE PASSE</Text>
              <View
                style={[
                  styles.field,
                  focusedField === 'password' && styles.fieldFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={19}
                  color={focusedField === 'password' ? '#39FF14' : '#666'}
                />
                <TextInput
                  placeholder="••••••••"
                  placeholderTextColor="#4a4a4a"
                  style={styles.fieldInput}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secure}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity
                  onPress={() => setSecure(!secure)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={secure ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* CONFIRM (signup) */}
            {isSignup && (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>CONFIRMER</Text>
                <View
                  style={[
                    styles.field,
                    focusedField === 'confirm' && styles.fieldFocused,
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={19}
                    color={focusedField === 'confirm' ? '#39FF14' : '#666'}
                  />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="#4a4a4a"
                    style={styles.fieldInput}
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry={secure}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>
            )}

            {/* FORGOT */}
            {!isSignup && (
              <TouchableOpacity style={styles.forgotBtn}>
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            )}

            {/* MAIN BUTTON */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleSubmit}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#39FF14', '#1FCC00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryGradient}
              >
                <Text style={styles.primaryText}>
                  {isSignup ? 'Créer mon compte' : 'Se connecter'}
                </Text>
                <Ionicons name="arrow-forward" size={18} color="#000" />
              </LinearGradient>
            </TouchableOpacity>

            {/* DIVIDER */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OU</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* GOOGLE */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogle}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <View style={styles.googleIconWrap}>
                    <Ionicons name="logo-google" size={18} color="#39FF14" />
                  </View>
                  <Text style={styles.googleText}>Continuer avec Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* SWITCH */}
          <View style={styles.switchWrap}>
            <Text style={styles.switchText}>
              {isSignup ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
            </Text>
            <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
              <Text style={styles.switchLink}>
                {isSignup ? ' Se connecter' : " S'inscrire"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* FOOTER */}
          <Text style={styles.footer}>
            © 2026 GoalPulse • Fait avec ⚽
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  // 🌌 GLOWS
  glowTop: {
    position: 'absolute',
    top: -150,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#39FF14',
    opacity: 0.08,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: '#39FF14',
    opacity: 0.05,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 22,
    paddingTop: 50,
    paddingBottom: 40,
  },

  // 🎨 HERO
  hero: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoGlow: {
    padding: 6,
    borderRadius: 80,
    backgroundColor: '#39FF1410',
    marginBottom: 18,
  },
  logoRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0a0a0a',
    borderWidth: 2,
    borderColor: '#39FF14',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#39FF14',
    shadowOpacity: 0.9,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 15,
  },
  logo: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  brand: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  brandUnderline: {
    width: 40,
    height: 3,
    backgroundColor: '#39FF14',
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 13,
    color: '#666',
    letterSpacing: 0.5,
  },

  // 📦 CARD
  card: {
    backgroundColor: '#0c0c0c',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  cardHeader: {
    marginBottom: 22,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },

  // 🔤 FIELDS
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#555',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
    marginLeft: 2,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1.5,
    borderColor: '#1f1f1f',
    gap: 10,
  },
  fieldFocused: {
    borderColor: '#39FF14',
    backgroundColor: '#0f120f',
    shadowColor: '#39FF14',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  fieldInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    height: '100%',
    paddingVertical: 0,
  },

  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 18,
  },
  forgotText: {
    color: '#39FF14',
    fontSize: 12,
    fontWeight: '600',
  },

  // 🟢 PRIMARY BUTTON
  primaryBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
    shadowColor: '#39FF14',
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  primaryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // DIVIDER
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#1a1a1a',
  },
  dividerText: {
    color: '#444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  // 🔵 GOOGLE
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#252525',
    gap: 10,
  },
  googleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#39FF1420',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // SWITCH
  switchWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  switchText: {
    color: '#555',
    fontSize: 13,
  },
  switchLink: {
    color: '#39FF14',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // FOOTER
  footer: {
    textAlign: 'center',
    color: '#2a2a2a',
    fontSize: 11,
    marginTop: 30,
    letterSpacing: 0.5,
  },
});
