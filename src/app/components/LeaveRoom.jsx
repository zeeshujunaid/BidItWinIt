import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ref, runTransaction } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";

import { useAuth } from "../context/Authcontext";
import { db, firestore } from "../utils/Firebase";

export default function LeaveRoom({ finalCoins, showCompleted = false }) {
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

            let leavingPlayerCoins;

            const result = await runTransaction(roomRef, (currentRoom) => {
              const leavingPlayer = currentRoom?.players?.[user.uid];

              if (!leavingPlayer) {
                return;
              }

              // Prevent the highest bidder from leaving
              // during an active auction
              if (
                currentRoom.auctionStatus === "bidding" &&
                currentRoom.currentHighBidder === user.uid
              ) {
                return currentRoom;
              }

              // Get the player's actual RTDB coins
              leavingPlayerCoins = Number(leavingPlayer.coins);

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

              // Only one player remains: finish the game
             if (
               currentRoom.status === "playing" &&
               remainingPlayers.length === 1
             ) {
               const remainingPlayer = remainingPlayers[0];

               // Refund the remaining player's reserved bid
               // if the auction was still active.
               if (
                 currentRoom.auctionStatus === "bidding" &&
                 currentRoom.currentHighBidder === remainingPlayer.uid
               ) {
                 remainingPlayer.coins =
                   Number(remainingPlayer.coins || 0) +
                   Number(currentRoom.currentBidPrice || 0);
               }

               const updatedRoom = {
                 ...currentRoom,
                 players: updatedPlayers,
                 presence: updatedPresence,
                 status: "completed",
                 completionReason: "one_player_remaining",
                 activePlayerId: "",
                 auctionEndsAt: null,
                 auctionStartedAt: null,
                 auctionStatus: "finished",
                 currentBidPrice: 0,
                 currentHighBidder: "",
               };

               // Transfer host if the leaving player was the host
               if (currentRoom.hostId === user.uid) {
                 updatedRoom.hostId = remainingPlayer.uid;
               }

               return updatedRoom;
             }

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

            const latestRoom = result.snapshot.val();

            // Check if the player is still the highest bidder
            if (
              latestRoom?.auctionStatus === "bidding" &&
              latestRoom?.currentHighBidder === user.uid
            ) {
              Alert.alert(
                "Cannot Leave Yet",
                "You are the highest bidder. Another player must outbid you before you can leave.",
              );

              return;
            }

            // Prefer final game balance if provided.
            // Otherwise use the actual RTDB player balance.
            const propCoins =
              finalCoins === undefined || finalCoins === null
                ? NaN
                : Number(finalCoins);

            const coinsToSave = Number.isFinite(propCoins)
              ? propCoins
              : leavingPlayerCoins;

            // Clear activeRoom and save coins in Firestore
            const userUpdate = {
              activeRoom: "",
            };

            if (Number.isFinite(coinsToSave)) {
              userUpdate.coins = Math.max(0, coinsToSave);
            }

            await updateDoc(doc(firestore, "users", user.uid), userUpdate);

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
      <View style={showCompleted ? styles.container : styles.buttonContainer}>
        <Modal
          visible={leaving}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#38BDF8" />

            <Text style={styles.loadingText}>Leaving Game...</Text>

            <Text style={styles.loadingSubtext}>
              Please wait while we update your game data.
            </Text>
          </View>
        </Modal>

        {showCompleted && (
          <>
            <Text style={styles.title}>Game Completed!</Text>
            <Text style={styles.message}>All items have been auctioned.</Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.leaveButton, leaving && styles.disabledButton]}
          onPress={handleLeaveRoom}
          disabled={leaving}
          activeOpacity={0.7}
        >
          <Ionicons name="exit-outline" size={26} color="#FFFFFF" />
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

  disabledButton: {
    opacity: 0.5,
  },

  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 17, 31, 0.96)",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 20,
  },

  loadingSubtext: {
    color: "#A8B7CA",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },

  leaveButton: {
    width: 55,
    height: 55,
    backgroundColor: "#8D2438",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0445E",
  },
});
