import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ref, onValue } from "firebase/database";
import { db } from "./utils/Firebase";

export default function Room() {
  const { roomId } = useLocalSearchParams();

  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    const playersRef = ref(db, `Rooms/${roomId}/players`);

    const unsubscribe = onValue(
      playersRef,
      (snapshot) => {
        const data = snapshot.val() || {};

        const playerList = Object.entries(data)
          .map(([uid, player]) => ({
            ...player,
            uid,
          }))
          .sort((a, b) => a.seatIndex - b.seatIndex);

        setPlayers(playerList);
        setLoading(false);
      },
      (error) => {
        console.log("Players load error:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00D9FF" />
        <Text style={styles.info}>Loading players...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Online Room</Text>
      <Text style={styles.roomName}>{roomId}</Text>

      <Text style={styles.count}>Players: {players.length}/5</Text>

      {players.length === 0 ? (
        <Text style={styles.info}>Abhi koi player join nahi hua.</Text>
      ) : (
        players.map((player) => (
          <View key={player.uid} style={styles.playerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(player.name || "P").charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={styles.playerDetails}>
              <Text style={styles.playerName}>{player.name || "Player"}</Text>
              <Text style={styles.playerId}>
                ID: {player.playerId || "N/A"}
              </Text>
              <Text style={styles.coins}>🪙 {player.coins ?? 10000} coins</Text>
            </View>

            <Text style={styles.seat}>Seat {(player.seatIndex ?? 0) + 1}</Text>
          </View>
        ))
      )}

      {players.length < 5 && (
        <Text style={styles.waiting}>
          Waiting for {5 - players.length} more player(s)...
        </Text>
      )}

      {players.length === 5 && <Text style={styles.full}>Room Full!</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#07111F",
    padding: 20,
    paddingTop: 50,
  },
  center: {
    flex: 1,
    backgroundColor: "#07111F",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "bold",
    textAlign: "center",
  },
  roomName: {
    color: "#00D9FF",
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
  },
  count: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 24,
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#122238",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#263D57",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#00A8CC",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },
  playerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  playerId: {
    color: "#A8B7CA",
    fontSize: 12,
    marginTop: 3,
  },
  coins: {
    color: "#FFD166",
    fontSize: 13,
    marginTop: 4,
  },
  seat: {
    color: "#00D9FF",
    fontSize: 12,
    fontWeight: "bold",
  },
  info: {
    color: "#A8B7CA",
    textAlign: "center",
    marginTop: 16,
  },
  waiting: {
    color: "#FFD166",
    textAlign: "center",
    marginTop: 20,
  },
  full: {
    color: "#46E6A5",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 20,
  },
});
