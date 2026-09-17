import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { ref, onValue } from 'firebase/database';
import { database } from './firebaseConfig';

interface Goal {
  id: string;
  title?: string;
  completed?: boolean;
}

export default function GoalList() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const goalsRef = ref(database, 'goals');

    const unsubscribe = onValue(
      goalsRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const goalsArray: Goal[] = Object.keys(data).map((key) => ({
            id: key,
            ...data[key],
          }));
          setGoals(goalsArray);
        } else {
          setGoals([]);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Erreur de lecture Firebase:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Chargement des objectifs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {goals.length === 0 ? (
        <Text style={styles.emptyText}>Aucun objectif pour le moment.</Text>
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.goalItem}>
              <Text style={styles.goalText}>{item.title || "Objectif sans titre"}</Text>
              <Text style={styles.goalStatus}>
                {item.completed ? "✅ Terminé" : "⏳ En cours"}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#0a0a0a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#39FF14', marginTop: 10 },
  emptyText: { textAlign: 'center', fontSize: 16, color: '#666', marginTop: 50 },
  goalItem: {
    backgroundColor: '#1c1c1c',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
  },
  goalText: { fontSize: 16, flex: 1, color: '#fff' },
  goalStatus: { fontSize: 14, fontWeight: 'bold', color: '#39FF14' },
});
