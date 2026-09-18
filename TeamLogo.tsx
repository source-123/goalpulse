import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const COLORS = [
  '#FF3366', '#39FF14', '#00BFFF', '#FFD700', '#FF6B6B',
  '#9D4EDD', '#06FFA5', '#FFA500', '#00CED1', '#FF1493',
];

const getColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
};

const getInitials = (name: string): string => {
  const clean = name.replace(/[U]\d+.*$/, '').replace(/[^a-zA-Z\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

interface Props {
  name: string;
  crest?: string;
  size?: number;
}

export default function TeamLogo({ name, crest, size = 36 }: Props) {
  // Si on a un crest URL, on l'utilise
  if (crest && crest.startsWith('http')) {
    return (
      <Image
        source={{ uri: crest }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#1a1a1a',
        }}
        resizeMode="contain"
      />
    );
  }

  // Sinon, logo avec initiales
  const bg = getColor(name);
  const initials = getInitials(name);
  return (
    <View
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg + '22',
          borderColor: bg,
        },
      ]}
    >
      <Text style={[styles.text, { color: bg, fontSize: size * 0.36 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  text: {
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
