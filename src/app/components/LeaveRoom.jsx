import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { ref, runTransaction } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";

import { useAuth } from "../context/Authcontext";
import { db, firestore } from "../utils/Firebase";

export default function LeaveRoom() {
  const { roomId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [leaving, setLeaving] = useState(false);

  const handleLeaveRoom = () => {
    if (leaving || !user?.uid || !roomId) return;

    Alert.alert("Leave Game", "Are you sure you want to leave?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          setLeaving(true);

          try {
            const roomRef = ref(db, `Rooms/${roomId}`);

            const result = await runTransaction(roomRef, (currentRoom) => {
              if (!currentRoom?.players?.[user.uid]) {
                return;
              }

              const updatedPlayers = {
                ...currentRoom.players,
              };

              delete updatedPlayers[user.uid];

              const updatedPresence = {
                ...(currentRoom.presence || {}),
              };

              delete updatedPresence[user.uid];

              const remainingPlayers = Object.values(updatedPlayers).sort(
                (a, b) => a.seatIndex - b.seatIndex,
              );

              // Last player leaves: reset current game data
              if (remainingPlayers.length === 0) {
                const updatedRoom = {
                  ...currentRoom,
                  players: {},
                  presence: {},
                  hostId: "",
                  status: "waiting",
                  activePlayerId: "",
                };

                delete updatedRoom.gameItems;
                delete updatedRoom.currentItemIndex;
                delete updatedRoom.currentRound;
                delete updatedRoom.currentBidPrice;
                delete updatedRoom.currentHighBidder;
                delete updatedRoom.auctionStatus;
                delete updatedRoom.passedPlayers;
                delete updatedRoom.phaseEndsAt;
                delete updatedRoom.winnerId;
                delete updatedRoom.winningBid;
                delete updatedRoom.actualValue;
                delete updatedRoom.profit;
                delete updatedRoom.resultType;

                return updatedRoom;
              }

              const updatedRoom = {
                ...currentRoom,
                players: updatedPlayers,
                presence: updatedPresence,
              };

              // Transfer host if host leaves
              if (currentRoom.hostId === user.uid) {
                updatedRoom.hostId = remainingPlayers[0].uid;
              }

              return updatedRoom;
            });

            if (!result.committed) {
              throw new Error("Could not leave the room.");
            }

            // Clear user's active room in Firestore
            await updateDoc(doc(firestore, "users", user.uid), {
              activeRoom: "",
            });

            router.replace("/(drawer)/Home");
          } catch (error) {
            console.log("Leave Game Error:", error);

            Alert.alert(
              "Leave Failed",
              "Something went wrong. Please try again.",
            );
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Completed!</Text>

      <Text style={styles.message}>All items have been auctioned.</Text>

      <TouchableOpacity
        style={[styles.leaveButton, leaving && styles.disabledButton]}
        onPress={handleLeaveRoom}
        disabled={leaving}
      >
        <Text style={styles.buttonText}>
          {leaving ? "Leaving..." : "Leave Game"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111F",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 12,
  },

  message: {
    color: "#A8B7CA",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
  },

  leaveButton: {
    backgroundColor: "#8D2438",
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 5,
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
