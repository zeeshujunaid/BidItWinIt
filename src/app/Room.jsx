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
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Instruction from "./components/Instruction";
import Toast from "react-native-toast-message";
import {
  ref,
  onValue,
  runTransaction,
  onDisconnect,
  set,
} from "firebase/database";
import { doc, updateDoc, collection, getDocs } from "firebase/firestore";
import { db, firestore } from "./utils/Firebase";
import Loader from "./components/Loader";
import Bubbels from "./components/Bubbels";
import {useAuth} from "./context/Authcontext"
import LeaveRoom from "./components/LeaveRoom";

export default function Room() {
const { user, loading: authLoading } = useAuth();
  const { roomId } = useLocalSearchParams();
const currentUserId = user?.uid || "";
  const router = useRouter();
  const [hostId, setHostId] = useState("");
  const [roomStatus, setRoomStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);


useEffect(() => {
  if (!roomId) return;

  const presenceRef = ref(db, `Rooms/${roomId}/presence`);
  const roomRef = ref(db, `Rooms/${roomId}`);

  const unsubscribe = onValue(presenceRef, async (snapshot) => {
    const presence = snapshot.val() || {};

    console.log("PRESENCE DATA:", presence);

    const disconnectedPlayers = Object.keys(presence).filter(
      (uid) => presence[uid] === false,
    );

    console.log("DISCONNECTED PLAYERS:", disconnectedPlayers);

    for (const disconnectedUID of disconnectedPlayers) {
      console.log("REMOVING PLAYER:", disconnectedUID);
      try {
        const result = await runTransaction(roomRef, (room) => {
          if (!room || room.status !== "waiting") {
            return;
          }

          if (!room.players?.[disconnectedUID]) {
            return;
          }

          const updatedPlayers = { ...room.players };

          // Player ko players se remove karo
          delete updatedPlayers[disconnectedUID];

          // Player ko presence se remove karo
          const updatedPresence = { ...room.presence };

          delete updatedPresence[disconnectedUID];

          // Remaining players
          const remainingPlayers = Object.entries(updatedPlayers).sort(
            ([, a], [, b]) => a.seatIndex - b.seatIndex,
          );

          room.players = updatedPlayers;
          room.presence = updatedPresence;

          // Host transfer
          if (room.hostId === disconnectedUID) {
            room.hostId = remainingPlayers[0]?.[0] || "";
          }

          return room;
        });

        // Transaction successful hone ke baad Firestore update
        if (result.committed) {
          await updateDoc(doc(firestore, "users", disconnectedUID), {
            activeRoom: "",
          });

          console.log("PLAYER REMOVED:", disconnectedUID);
          console.log("ACTIVE ROOM CLEARED:", disconnectedUID);
        }
      } catch (error) {
        console.log("PLAYER REMOVAL ERROR:", error);
      }
    }
  });

  return () => {
    unsubscribe();
  };
}, [roomId]);


  useEffect(() => {
    if (!roomId || !user?.uid) return;

    const connectedRef = ref(db, ".info/connected");
    const presenceRef = ref(db, `Rooms/${roomId}/presence/${user.uid}`);

    const unsubscribe = onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() === true) {
        try {
          // Pehle disconnect action register hoga
          await onDisconnect(presenceRef).set(false);

          // Phir player online mark hoga
          await set(presenceRef, true);

          console.log("PLAYER ONLINE:", user.uid);
        } catch (error) {
          console.log("Presence Error:", error);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [roomId, user?.uid]);

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
      Toast.show({
        type: "error",
        text1: "At least 2 players required to start the game.",
      });
      return;
    }

    try {
      const roomRef = ref(db, `Rooms/${roomId}`);

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
        Toast.show({
          type: "error",
          text1: "Unable to Start Game",
        });
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

      await runTransaction(ref(db, `Rooms/${roomId}`), (room) => {
        if (room?.hostId === currentUserId && room.status === "preparing") {
          return { ...room, status: "waiting" };
        }
        return;
      });

      Toast.show({
        type: "error",
        text1: "Failed to start game. Please try again.",
      });
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
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to load room data.",
        });
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId]);

  // Leave Room
  // const handleLeaveRoom = async () => {
  //   if (leaving) return;

  //   Alert.alert("Leave Room", "Are you sure you want to leave this room?", [
  //     {
  //       text: "Cancel",
  //       style: "cancel",
  //     },
  //     {
  //       text: "Leave",
  //       style: "destructive",
  //       onPress: async () => {
  //         setLeaving(true);

  //         try {
  //           if (!user?.uid) {
  //             throw new Error(
  //               "User information not found. Please login again.",
  //             );
  //           }

  //           // Update room atomically
  //           const roomRef = ref(db, `Rooms/${roomId}`);

  //           const result = await runTransaction(roomRef, (room) => {
  //             if (!room || !room.players) return;

  //             const players = { ...room.players };

  //             // Remove leaving player
  //             delete players[user.uid];

  //             const remainingPlayers = Object.values(players);

  //             // If no players are left
  //             if (remainingPlayers.length === 0) {
  //               room.hostId = "";
  //               room.status = "waiting";
  //               delete room.players;
  //               delete room.gameItems;
  //               delete room.currentItemIndex;
  //               delete room.currentRound;
  //               delete room.currentBidPrice;
  //               delete room.currentHighBidder;
  //               delete room.activePlayerId;
  //               delete room.passedPlayers;
  //               delete room.auctionStatus;
  //               delete room.winnerId;
  //               delete room.winningBid;
  //               delete room.presence 

  //               return room;
  //             }

  //             // Check whether current host is still in the room
  //             const hostStillExists = players[room.hostId];

  //             if (!hostStillExists) {
  //               // Assign host to next available player
  //               const nextHost = remainingPlayers.sort(
  //                 (a, b) => a.seatIndex - b.seatIndex,
  //               )[0];

  //               room.hostId = nextHost.uid;
  //             }

  //             room.players = players;

  //             return room;
  //           });

  //           if (!result.committed) {
  //             throw new Error("Could not update room.");
  //           }

  //           // Reset activeRoom in Firestore
  //           await updateDoc(doc(firestore, "users", user.uid), {
  //             activeRoom: "",
  //           });


  //           Alert.alert("Success", "You left the room successfully.");

  //           router.replace("/(drawer)/Onlineplay");
  //         } catch (error) {
  //           console.log("Leave Room Error:", error);

  //           Alert.alert(
  //             "Leave Failed",
  //             error.message || "Could not leave the room.",
  //           );
  //         } finally {
  //           setLeaving(false);
  //         }
  //       },
  //     },
  //   ]);
  // };

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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.openDrawer()}
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.title}>Online Room</Text>
            <Text style={styles.roomName}>{roomId}</Text>
          </View>

          <View style={styles.headerButton}>
            <LeaveRoom roomId={roomId} />
          </View>
        </View>
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
            resizeMode="cover"
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },

  headerButton: {
    width: "20%",
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },

  headerCenter: {
    width: "60%",
    justifyContent: "center",
    alignItems: "center",
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
    aspectRatio: 1.8,
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
    alignItems: "space-around",
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
