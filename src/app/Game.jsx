import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ref, onValue, runTransaction } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import { db, firestore } from "./utils/Firebase";

const BID_AMOUNTS = [100, 250, 500, 1000, 2000];

export default function Game() {
  const { roomId } = useLocalSearchParams();
  const router = useRouter();

  const [room, setRoom] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = await AsyncStorage.getItem("user");

      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, `Rooms/${roomId}`);

    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        setRoom(snapshot.val());
        setLoading(false);
      },
      (error) => {
        console.log("Game listener error:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId]);

  const players = Object.values(room?.players || {}).sort(
    (a, b) => a.seatIndex - b.seatIndex,
  );

  const currentItem = room?.gameItems?.[room?.currentItemIndex || 0];

  const currentBid = room?.currentBidPrice || 0;

  const activePlayer = players.find(
    (player) => player.uid === room?.activePlayerId,
  );

  const isMyTurn = user?.uid === room?.activePlayerId;

  const passedPlayers = room?.passedPlayers || {};

  const imageurl =
    currentItem?.imageurl ||
    currentItem?.imageURL ||
    currentItem?.photoUrl ||
    currentItem?.image ||
    "";

  useEffect(() => {
    setImageError(false);
  }, [currentItem?.id, imageurl]);

  const finishAuction = (currentRoom, winnerId) => {
    return {
      ...currentRoom,
      auctionStatus: "finished",
      activePlayerId: "",
      winnerId: winnerId || "",
      winningBid: currentRoom.currentBidPrice || 0,
    };
  };

  const handleAuctionAction = async (action, amount = 0) => {
    if (!user?.uid || actionLoading || !isMyTurn) return;

    setActionLoading(true);

    try {
      const roomRef = ref(db, `Rooms/${roomId}`);

      const result = await runTransaction(roomRef, (currentRoom) => {
        if (!currentRoom) return;
        if (currentRoom.status !== "playing") return;
        if (currentRoom.auctionStatus === "finished") return;
        if (currentRoom.activePlayerId !== user.uid) return;

        const allPlayers = Object.values(currentRoom.players || {}).sort(
          (a, b) => a.seatIndex - b.seatIndex,
        );

        const passed = { ...(currentRoom.passedPlayers || {}) };

        if (passed[user.uid]) return;

        if (action === "bid") {
          const newBid = (currentRoom.currentBidPrice || 0) + amount;

          currentRoom.currentBidPrice = newBid;
          currentRoom.currentHighBidder = user.uid;
        }

        if (action === "pass") {
          passed[user.uid] = true;
        }

        currentRoom.passedPlayers = passed;

        const eligiblePlayers = allPlayers.filter(
          (player) => !passed[player.uid],
        );

        // No eligible players left: auction is over
        if (eligiblePlayers.length === 0) {
          return finishAuction(
            currentRoom,
            currentRoom.currentHighBidder || "",
          );
        }

        // After a bid, only the bidder remains eligible
        if (
          action === "bid" &&
          eligiblePlayers.length === 1 &&
          eligiblePlayers[0].uid === user.uid
        ) {
          return finishAuction(currentRoom, user.uid);
        }

        // Find the next eligible player in seat order
        const currentIndex = allPlayers.findIndex(
          (player) => player.uid === user.uid,
        );

        let nextPlayer = null;

        for (let i = 1; i <= allPlayers.length; i++) {
          const nextIndex = (currentIndex + i) % allPlayers.length;
          const candidate = allPlayers[nextIndex];

          if (candidate && !passed[candidate.uid]) {
            nextPlayer = candidate;
            break;
          }
        }

        if (!nextPlayer) {
          return finishAuction(
            currentRoom,
            currentRoom.currentHighBidder || "",
          );
        }

        currentRoom.activePlayerId = nextPlayer.uid;

        return currentRoom;
      });

      if (!result.committed) {
        Alert.alert("Action Failed", "Your turn is no longer active.");
      }
    } catch (error) {
      console.log("Auction Error:", error);
      Alert.alert("Error", error.message);
    } finally {
      setActionLoading(false);
    }
  };


  const handleNextRound = async () => {
    try {
      const roomRef = ref(db, `Rooms/${roomId}`);

      await runTransaction(roomRef, (currentRoom) => {
        if (!currentRoom) return;
        if (currentRoom.auctionStatus !== "finished") return;

        const nextIndex = (currentRoom.currentItemIndex || 0) + 1;

        // Check if all items are completed
        if (nextIndex >= currentRoom.gameItems.length) {
          return {
            ...currentRoom,
            status: "completed",
            auctionStatus: "finished",
            activePlayerId: "",
          };
        }

        const sortedPlayers = Object.values(currentRoom.players || {}).sort(
          (a, b) => a.seatIndex - b.seatIndex,
        );

        return {
          ...currentRoom,
          currentItemIndex: nextIndex,
          currentRound: nextIndex + 1,
          currentBidPrice: 0,
          currentHighBidder: "",
          activePlayerId: sortedPlayers[0]?.uid || "",
          passedPlayers: {},
          auctionStatus: "bidding",
          winnerId: "",
          winningBid: 0,
        };
      });
    } catch (error) {
      console.log("Next Round Error:", error);
      Alert.alert("Error", error.message);
    }
  };

  const handleLeaveRoom = () => {
    Alert.alert("Leave Game", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            const roomRef = ref(db, `Rooms/${roomId}`);

            const result = await runTransaction(roomRef, (currentRoom) => {
              if (!currentRoom?.players || !currentRoom.players[user.uid]) {
                return;
              }

              const updatedPlayers = { ...currentRoom.players };
              delete updatedPlayers[user.uid];

              const remainingPlayers = Object.values(updatedPlayers).sort(
                (a, b) => a.seatIndex - b.seatIndex,
              );

              currentRoom.players = updatedPlayers;

              if (remainingPlayers.length === 0) {
                currentRoom.hostId = "";
                currentRoom.status = "waiting";
                currentRoom.activePlayerId = "";
                currentRoom.auctionStatus = "finished";
                return currentRoom;
              }

              if (currentRoom.hostId === user.uid) {
                currentRoom.hostId = remainingPlayers[0].uid;
              }

              if (currentRoom.activePlayerId === user.uid) {
                const nextPlayer = remainingPlayers.find(
                  (player) => !currentRoom.passedPlayers?.[player.uid],
                );

                if (nextPlayer) {
                  currentRoom.activePlayerId = nextPlayer.uid;
                } else {
                  currentRoom.activePlayerId = "";
                  currentRoom.auctionStatus = "finished";
                  currentRoom.winnerId = currentRoom.currentHighBidder || "";
                }
              }

              return currentRoom;
            });

            if (!result.committed) {
              throw new Error("Could not leave the room.");
            }

            await updateDoc(doc(firestore, "users", user.uid), {
              activeRoom: "",
            });

            await AsyncStorage.setItem(
              "user",
              JSON.stringify({
                ...user,
                activeRoom: "",
              }),
            );

            router.replace("/(drawer)/Onlineplay");
          } catch (error) {
            console.log("Leave Game Error:", error);
            Alert.alert("Leave Failed", error.message);
          }
        },
      },
    ]);
  };

  if (loading || !user || !room) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00D9FF" />
        <Text style={styles.text}>Loading game...</Text>
      </View>
    );
  }

  if (room.status === "completed") {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Game Completed!</Text>
        <Text style={styles.text}>All items have been auctioned.</Text>

        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveRoom}>
          <Text style={styles.buttonText}>Leave Game</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentItem) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>No game item found.</Text>
        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveRoom}>
          <Text style={styles.buttonText}>Leave Room</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const winner = players.find((player) => player.uid === room.winnerId);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bid It Win It</Text>

      <Text style={styles.room}>Room: {roomId}</Text>

      <Text style={styles.round}>
        Item {(room.currentItemIndex || 0) + 1} / {room.gameItems.length}
      </Text>

      {imageurl && !imageError ? (
        <Image
          source={{ uri: imageurl }}
          style={styles.image}
          resizeMode="contain"
          onError={(error) => {
            console.log("Item image failed:", imageurl, error.nativeEvent);
            setImageError(true);
          }}
        />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.text}>Image not available</Text>
        </View>
      )}

      <Text style={styles.itemName}>{currentItem.name}</Text>

      <Text style={styles.description}>{currentItem.description}</Text>

      <Text style={styles.feature}>{currentItem.specialFeature}</Text>

      <View style={styles.bidBox}>
        <Text style={styles.bidLabel}>Current Highest Bid</Text>
        <Text style={styles.bidPrice}>${currentBid}</Text>
        <Text style={styles.bidder}>
          Highest Bidder:{" "}
          {players.find((player) => player.uid === room.currentHighBidder)
            ?.name || "No bids yet"}
        </Text>
      </View>

      <View style={styles.turnBox}>
        <Text style={styles.turnText}>
          {room.auctionStatus === "finished"
            ? winner
              ? `Winner: ${winner.name}`
              : "Item Unsold"
            : activePlayer
              ? `${activePlayer.name}'s Turn`
              : "Waiting..."}
        </Text>
      </View>

      {room.auctionStatus === "finished" ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {winner ? "Item Won!" : "No One Bid"}
          </Text>
          <Text style={styles.text}>
            {winner
              ? `${winner.name} won this item for $${room.winningBid}`
              : "This item remained unsold."}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.buttonHeading}>
            {isMyTurn ? "Your Turn - Place Your Bid" : "Waiting for Player"}
          </Text>

          {isMyTurn ? (
            <>
              <View style={styles.buttons}>
                {BID_AMOUNTS.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.bidButton}
                    onPress={() => handleAuctionAction("bid", amount)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.buttonText}>+${amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.noBidButton}
                onPress={() => handleAuctionAction("pass")}
                disabled={actionLoading}
              >
                <Text style={styles.buttonText}>No Bid / Pass</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.waitingText}>
              {activePlayer?.name || "Another player"} is making a decision...
            </Text>
          )}
        </>
      )}

      <Text style={styles.playersHeading}>Players</Text>

      {players.map((player) => (
        <View key={player.uid} style={styles.playerCard}>
          <Text style={styles.playerName}>
            {player.name}
            {player.uid === room.activePlayerId ? "  (Turn)" : ""}
            {passedPlayers[player.uid] ? "  (Passed)" : ""}
            {player.uid === room.currentHighBidder ? "  (Highest)" : ""}
          </Text>
        </View>
      ))}

      <TouchableOpacity style={styles.bidButton} onPress={handleNextRound}>
        <Text style={styles.buttonText}>Next Round</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveRoom}>
        <Text style={styles.buttonText}>Leave Room</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#07111F",
    padding: 20,
    paddingTop: 45,
    alignItems: "center",
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
  },
  room: {
    color: "#00D9FF",
    marginTop: 8,
  },
  round: {
    color: "#FFD166",
    marginTop: 20,
    fontSize: 16,
  },
  image: {
    width: 230,
    height: 190,
    marginTop: 20,
  },
  imagePlaceholder: {
    width: 230,
    height: 190,
    marginTop: 20,
    backgroundColor: "#122238",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  itemName: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "bold",
    marginTop: 12,
  },
  description: {
    color: "#A8B7CA",
    textAlign: "center",
    marginTop: 8,
  },
  feature: {
    color: "#FFD166",
    marginTop: 8,
    textAlign: "center",
  },
  bidBox: {
    backgroundColor: "#122238",
    width: "100%",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 25,
  },
  bidLabel: {
    color: "#A8B7CA",
  },
  bidPrice: {
    color: "#46E6A5",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 5,
  },
  bidder: {
    color: "#FFFFFF",
    marginTop: 8,
  },
  turnBox: {
    backgroundColor: "#17334B",
    padding: 14,
    borderRadius: 12,
    width: "100%",
    marginTop: 18,
    alignItems: "center",
  },
  turnText: {
    color: "#00D9FF",
    fontSize: 17,
    fontWeight: "bold",
  },
  buttonHeading: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 12,
  },
  buttons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  bidButton: {
    backgroundColor: "#00A8CC",
    paddingVertical: 14,
    paddingHorizontal: 19,
    borderRadius: 10,
  },
  noBidButton: {
    backgroundColor: "#D9364F",
    padding: 16,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 15,
  },
  waitingText: {
    color: "#A8B7CA",
    marginTop: 10,
    textAlign: "center",
  },
  resultBox: {
    backgroundColor: "#17334B",
    padding: 18,
    borderRadius: 12,
    width: "100%",
    marginTop: 20,
    alignItems: "center",
  },
  resultTitle: {
    color: "#46E6A5",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 8,
  },
  playersHeading: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "bold",
    marginTop: 25,
    marginBottom: 10,
  },
  playerCard: {
    backgroundColor: "#122238",
    padding: 13,
    borderRadius: 10,
    width: "100%",
    marginBottom: 8,
  },
  playerName: {
    color: "#FFFFFF",
  },
  leaveButton: {
    backgroundColor: "#D9364F",
    padding: 16,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 30,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  text: {
    color: "#FFFFFF",
    textAlign: "center",
  },
});
