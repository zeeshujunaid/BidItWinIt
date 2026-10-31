import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ref, onValue, runTransaction } from "firebase/database";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db, firestore } from "./utils/Firebase";

export default function Room() {
  const { roomId } = useLocalSearchParams();
  const [currentUserId, setCurrentUserId] = useState("");
  const router = useRouter();
  const [hostId, setHostId] = useState("");
  const [roomStatus, setRoomStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);


  useEffect(() => {
    const loadUser = async () => {
      const savedUser = await AsyncStorage.getItem("user");

      if (savedUser) {
        const user = JSON.parse(savedUser);
        setCurrentUserId(user.uid);
      }
    };

    loadUser();
  }, []);

const getRandomItems = (items, count = 10) => {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
};


 const handleStartGame = async () => {
  
   if (players.length < 2) {
     Alert.alert(
       "Not Enough Players",
       "Game start karne ke liye kam az kam 2 players chahiye.",
     );
     return;
   }

   try {
     const roomRef = ref(db, `Rooms/${roomId}`);

     // Check room status and host
     const result = await runTransaction(roomRef, (room) => {
       if (!room || room.hostId !== currentUserId) return;
       if (room.status !== "waiting") return;
       if (Object.keys(room.players || {}).length < 2) return;

       // Temporary lock so another start attempt cannot run
       return {
         ...room,
         status: "preparing",
       };
     });

     if (!result.committed) {
       Alert.alert("Unable to Start", "Room start nahi ho saka.");
       return;
     }

     // Fetch items from Firestore
     const gameDataRef = collection(firestore, "Gamedata");
     const snapshot = await getDocs(gameDataRef);

     const allItems = snapshot.docs.map((itemDoc) => ({
       id: itemDoc.id,
       ...itemDoc.data(),
     }));

if (allItems.length === 0) {
  throw new Error("Gamedata collection mein koi item nahi mila.");
}

     // Select maximum 10 random items
     const selectedItems = getRandomItems(allItems, 10);

     // Save selected items and start game
     const saveResult = await runTransaction(roomRef, (room) => {
       if (!room || room.hostId !== currentUserId) return;
       if (room.status !== "preparing") return;

       const sortedPlayers = Object.values(room.players || {}).sort(
         (a, b) => a.seatIndex - b.seatIndex,
       );

       return {
         ...room,
         gameItems: selectedItems,
         currentItemIndex: 0,
         currentRound: 1,
         currentBidPrice: 0,
         currentHighBidder: "",

         // First turn goes to Seat 1
         activePlayerId: sortedPlayers[0]?.uid || "",

         // No Bid tracking
         passedPlayers: {},

         // Auction status
         auctionStatus: "bidding",

         status: "playing",
       };
     });

     if (!saveResult.committed) {
       throw new Error("Game data save nahi ho saka.");
     }
   } catch (error) {
     console.log("Start Game Error:", error);

     // Allow host to retry if preparation failed
     await runTransaction(ref(db, `Rooms/${roomId}`), (room) => {
       if (room?.hostId === currentUserId && room.status === "preparing") {
         return { ...room, status: "waiting" };
       }
       return;
     });

     Alert.alert("Error", error.message);
   }
 };

useEffect(() => {
  if (!roomId) {
    setLoading(false);
    return;
  }

  const roomRef = ref(db, `Rooms/${roomId}`);

  const unsubscribe = onValue(
    roomRef,
    (snapshot) => {
      const room = snapshot.val() || {};
      const data = room.players || {};

      const playerList = Object.entries(data)
        .map(([uid, player]) => ({
          ...player,
          uid,
        }))
        .sort((a, b) => a.seatIndex - b.seatIndex);

      setPlayers(playerList);
      setHostId(room.hostId || "");
   if (room.status === "playing") {
     router.replace(`/Game?roomId=${roomId}`);
   }
      setLoading(false);
    },
    (error) => {
      console.log("Room error:", error);
      setLoading(false);
    },
  );

  return unsubscribe;
}, [roomId]);

  // Leave Room
  const handleLeaveRoom = async () => {
    if (leaving) return;

    Alert.alert("Leave Room", "Are you sure you want to leave this room?", [
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
            const savedUser = await AsyncStorage.getItem("user");

            if (!savedUser) {
              throw new Error("User information not found.");
            }

            const user = JSON.parse(savedUser);

            if (!user.uid) {
              throw new Error("User UID not found.");
            }

            // Update room atomically
            const roomRef = ref(db, `Rooms/${roomId}`);

            const result = await runTransaction(roomRef, (room) => {
              if (!room || !room.players) return;

              const players = { ...room.players };

              // Remove leaving player
              delete players[user.uid];

              const remainingPlayers = Object.values(players);

              // If no players are left
              if (remainingPlayers.length === 0) {
                room.hostId = "";
                room.status = "waiting";
                delete room.players;

                return room;
              }

              // Check whether current host is still in the room
              const hostStillExists = players[room.hostId];

              if (!hostStillExists) {
                // Assign host to next available player
                const nextHost = remainingPlayers.sort(
                  (a, b) => a.seatIndex - b.seatIndex,
                )[0];

                room.hostId = nextHost.uid;
              }

              room.players = players;

              return room;
            });

            if (!result.committed) {
              throw new Error("Could not update room.");
            }

            // Reset activeRoom in Firestore
            await updateDoc(doc(firestore, "users", user.uid), {
              activeRoom: "",
            });

            // Update AsyncStorage
            await AsyncStorage.setItem(
              "user",
              JSON.stringify({
                ...user,
                activeRoom: "",
              }),
            );

            Alert.alert("Success", "You left the room successfully.");

            router.replace("/(drawer)/Onlineplay");
          } catch (error) {
            console.log("Leave Room Error:", error);

            Alert.alert(
              "Leave Failed",
              error.message || "Could not leave the room.",
            );
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

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

      {hostId === currentUserId && roomStatus === "waiting" && (
        <TouchableOpacity style={styles.startButton} onPress={handleStartGame}>
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.leaveButton, leaving && styles.disabledButton]}
        onPress={handleLeaveRoom}
        disabled={leaving}
      >
        {leaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.leaveText}>Leave Room</Text>
        )}
      </TouchableOpacity>
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
  startButton: {
    backgroundColor: "#00A8CC",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },

  startButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "bold",
  },
  leaveButton: {
    backgroundColor: "#D9364F",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 20,
  },
  leaveText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
