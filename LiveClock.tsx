import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  status: string; // "45", "HT", "FT", etc.
  size?: 'small' | 'large';
}

// 🕐 Chrono live qui avance chaque seconde
export default function LiveClock({ status, size = 'small' }: Props) {
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Statut de départ
  const isHT = status === 'HT';
  const isFT = status === 'FT' || parseInt(status, 10) >= 90;
  const initialMinute = parseInt(status, 10) || 0;

  useEffect(() => {
    if (isHT || isFT) {
      setMinutes(initialMinute);
      setSeconds(0);
      return;
    }

    // Démarrer à la minute donnée par l'API
    setMinutes(initialMinute);
    setSeconds(0);

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s >= 59) {
          setMinutes((m) => Math.min(m + 1, 90));
          return 0;
        }
        return s + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  if (isFT) {
    return (
      <View style={[styles.badge, size === 'large' && styles.badgeLarge, { backgroundColor: '#33333380' }]}>
        <Text style={[styles.text, size === 'large' && styles.textLarge, { color: '#999' }]}>
          ✅ Terminé
        </Text>
      </View>
    );
  }

  if (isHT) {
    return (
      <View style={[styles.badge, size === 'large' && styles.badgeLarge, { backgroundColor: '#FFD70020' }]}>
        <Text style={[styles.text, size === 'large' && styles.textLarge, { color: '#FFD700' }]}>
          ⏸️ Mi-temps
        </Text>
      </View>
    );
  }

  // Live normal
  const displaySeconds = seconds.toString().padStart(2, '0');

  return (
    <View style={[styles.badge, size === 'large' && styles.badgeLarge]}>
      <View style={styles.pulseDot} />
      <Text style={[styles.text, size === 'large' && styles.textLarge]}>
        {minutes}' {size === 'large' ? `${displaySeconds}"` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#39FF1420',
  },
  badgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#39FF14',
  },
  text: {
    color: '#39FF14',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  textLarge: {
    fontSize: 13,
  },
});
