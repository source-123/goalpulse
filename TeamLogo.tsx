import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Couleurs déterministes selon le nom
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
  const clean = name.replace(/[U]\d+.*$/, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
};

interface Props {
  name: string;
  size?: number;
}

export default function TeamLogo({ name, size = 36 }: Props) {
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
      <Text style={[styles.text, { color: bg, fontSize: size * 0.4 }]}>
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
    letterSpacing: 0.5,
  },
});
