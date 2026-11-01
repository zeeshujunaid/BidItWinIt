import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Instruction from "./components/Instruction";
import { ref, onValue, runTransaction } from "firebase/database";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db, firestore } from "./utils/Firebase";
import Loader from "./components/Loader";
import Bubbels from "./components/Bubbels";

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
        setRoomStatus(room.status || "waiting");
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
    return <Loader />;
  }

  return (
    <View style={styles.screen}>
      <Bubbels />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Online Room</Text>
        <Text style={styles.roomName}>{roomId}</Text>

        <Instruction />
        <View style={styles.playerInfo}>
          <View style={styles.countBox}>
            <Text style={styles.count}>PLAYERS {players.length}/5</Text>
          </View>

          <View style={styles.playerDetails}>
            <View style={styles.coinIcon}>
              <Text style={styles.coinEmoji}>🪙</Text>
            </View>

            <View style={styles.coinInfo}>
              <Text style={styles.coinLabel}>YOUR BALANCE</Text>
              <Text style={styles.coins}>
                {(
                  players.find((p) => p.uid === currentUserId)?.coins ?? 10000
                ).toLocaleString()}
                <Text style={styles.coinUnit}> COINS</Text>
              </Text>
            </View>
          </View>
        </View>
        {/* Character Table */}
        <View style={styles.tableWrapper}>
          <Text style={styles.waiting}>
            {players.length < 5
              ? `Waiting for ${5 - players.length} more player(s)...`
              : "All players are ready!"}
          </Text>

          <ImageBackground
            source={require("../../assets/images/chracter/waitingchracter.png")}
            style={styles.characterTable}
            resizeMode="contain"
          >
            {[0, 1, 2, 3, 4].map((seatIndex) => {
              const player = players.find(
                (p) => Number(p.seatIndex) === seatIndex,
              );

              const avatar =
                player?.photoURL ||
                player?.avatarUrl ||
                player?.profilePic ||
                player?.photoUrl;

              return (
                <View
                  key={seatIndex}
                  style={[styles.characterSeat, styles[`seat${seatIndex + 1}`]]}
                >
                  <View
                    style={[
                      styles.profileBorder,
                      player && styles.activeProfile,
                    ]}
                  >
                    {avatar ? (
                      <Image
                        source={{ uri: avatar }}
                        style={styles.profileImage}
                      />
                    ) : (
                      <View style={styles.emptyAvatar}>
                        <Text style={styles.plus}>+</Text>
                      </View>
                    )}
                  </View>

                  {player && (
                    <View style={styles.nameTag}>
                      <Text style={styles.playerName} numberOfLines={1}>
                        {player.name || "Player"}
                      </Text>
                    </View>
                  )}

                  {player?.uid === hostId && (
                    <Text style={styles.hostBadge}>👑 HOST</Text>
                  )}
                </View>
              );
            })}
          </ImageBackground>
        </View>
        <View style={styles.actionButtons}>
          {hostId === currentUserId && roomStatus === "waiting" && (
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStartGame}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>▶ START</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.leaveButton, leaving && styles.disabledButton]}
            onPress={handleLeaveRoom}
            disabled={leaving}
            activeOpacity={0.8}
          >
            {leaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.leaveText}>LEAVE ROOM</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111F",
    overflow: "hidden",
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 35,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  roomName: {
    color: "#00D9FF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 7,
  },
  countBox: {
    alignSelf: "center",
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#24536D",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 15,
  },

  count: {
    color: "#00D9FF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },

  playerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },

  playerDetails: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#122B40",
    borderWidth: 1,
    borderColor: "#80652D",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    minWidth: 190,
  },

  coinIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#3B3423",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  coinEmoji: {
    fontSize: 23,
  },

  coinInfo: {
    gap: 3,
  },

  coinLabel: {
    color: "#A8B7CA",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },

  coins: {
    color: "#FFD166",
    fontSize: 20,
    fontWeight: "900",
  },

  coinUnit: {
    color: "#D5B86A",
    fontSize: 10,
    fontWeight: "800",
  },
  tableWrapper: {
    width: "100%",
    alignItems: "center",
    marginTop: 5,
  },

  characterTable: {
    width: "100%",
    aspectRatio: 2,
    position: "relative",
  },

  characterSeat: {
    position: "absolute",
    width: 62,
    alignItems: "center",
  },

  // Avatar positions: left to right
  seat1: {
    left: "4%",
    top: "14%",
  },

  seat2: {
    left: "22%",
    top: "14%",
  },

  seat3: {
    left: "41%",
    top: "14%",
  },

  seat4: {
    left: "60%",
    top: "14%",
  },

  seat5: {
    left: "79%",
    top: "14%",
  },

  profileBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#263D57",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  activeProfile: {
    borderColor: "#00D9FF",
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },

  emptyAvatar: {
    flex: 1,
    width: "100%",
    borderRadius: 50,
    backgroundColor: "#152B40",
    justifyContent: "center",
    alignItems: "center",
  },

  plus: {
    color: "#00D9FF",
    fontSize: 25,
    fontWeight: "400",
  },

  nameTag: {
    backgroundColor: "#07111F",
    borderWidth: 1,
    borderColor: "#24536D",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginTop: 5,
    maxWidth: 76,
  },

  playerName: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
    textAlign: "center",
  },

  hostBadge: {
    color: "#FFD166",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
  },

  waiting: {
    color: "#A8B7CA",
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    marginTop: 25,
  },

  startButton: {
    flex: 1,
    backgroundColor: "#00D9FF",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#55E8FF",
    elevation: 5,
  },

  startButtonText: {
    color: "#07111F",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  leaveButton: {
    flex: 1,
    backgroundColor: "#18283B",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D9364F",
  },

  leaveText: {
    color: "#FF6478",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },

  disabledButton: {
    opacity: 0.6,
  },
});
