import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { doc, updateDoc } from "firebase/firestore";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/Authcontext";
import { ref, onValue, runTransaction } from "firebase/database";
import { db, firestore } from "../utils/Firebase";
import Header from "../components/Header";
import Bubbels from "../components/Bubbels";
import Loader from "../components/Loader";

const ROOM_NAMES = ["Room1", "Room2", "Room3", "Room4", "Room5"];

export default function OnlinePlay() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [joiningRoom, setJoiningRoom] = useState("");

  useEffect(() => {
    const roomsRef = ref(db, "Rooms");

    const unsubscribe = onValue(
      roomsRef,
      (snapshot) => {
        setRooms(snapshot.val() || {});
        setLoading(false);
      },
      (error) => {
        console.log("Rooms error:", error);
        setLoading(false);
        Toast.show({
          type: "error",
          message: "Something went wrong",
        });
      },
    );

    return unsubscribe;
  }, []);

  const handleJoinRoom = async (roomId) => {
    if (joiningRoom) return;

    if (!user?.uid) {
      Toast.show({
        type: "error",
        text1: "Please log in to join a room.",
      });
      return;
    }

    setJoiningRoom(roomId);

    try {
      const uid = user.uid;

      const activeRoom = user.activeRoom || "";

      if (activeRoom && activeRoom !== roomId) {
        Toast.show({
          type: "error",
          text1: "You are already in another room. Please leave that room first.",
        });
        return;
      }

      const playerData = {
        uid,
        name: user.name || "Player",
        playerId: user.playerId || "",
        coins: Number(user.coins ?? 10000),
        isConnected: true,
      };

      const roomRef = ref(db, `Rooms/${roomId}`);

      const result = await runTransaction(roomRef, (room) => {
        if (!room) return;

        const players = room.players || {};

        if (players[uid]) {
          return room;
        }

        if (room.status !== "waiting") {
          return;
        }

        const maxPlayers = room.maxPlayers || 5;

        if (Object.keys(players).length >= maxPlayers) {
          return;
        }

        const usedSeats = Object.values(players).map(
          (player) => player.seatIndex,
        );

        let seatIndex = 0;

        while (usedSeats.includes(seatIndex) && seatIndex < maxPlayers) {
          seatIndex++;
        }

        if (seatIndex >= maxPlayers) {
          return;
        }

        room.players = {
          ...players,
          [uid]: {
            ...playerData,
            seatIndex,
          },
        };

        if (!room.hostId) {
          room.hostId = uid;
        }

        return room;
      });

      if (!result.committed) {
        Toast.show({
          type: "error",
          text1: "Room is full or not available.",
        });
        return;
      }

      await updateDoc(doc(firestore, "users", uid), {
        activeRoom: roomId,
      });

      router.push({
        pathname: "/Room",
        params: { roomId },
      });
    } catch (error) {
      console.log("Join room error:", error);

      Toast.show({
        type: "error",
        text1: "Failed to join room. Please try again.",
      });
    } finally {
      setJoiningRoom("");
    }
  };

  if (loading || authLoading) {
    return <Loader />;
  }

  return (
    <View style={styles.screen}>
      <Bubbels />
      <Header />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.heading}>Online Play</Text>
          <Text style={styles.subtitle}>
            Find a room, join the action, and compete with players.
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Public Rooms</Text>
          <Text style={styles.roomCount}>05 ROOMS</Text>
        </View>

        {ROOM_NAMES.map((roomId, index) => {
          const room = rooms[roomId];
          const status = room?.status || "unavailable";
          const players = room?.players || {};
          const playerCount = Object.keys(players).length;
          const maxPlayers = room?.maxPlayers || 5;
          const isWaiting = status === "waiting" && playerCount < maxPlayers;
          const isJoining = joiningRoom === roomId;

          const statusLabel = !room
            ? "Unavailable"
            : status === "active" || status === "playing"
              ? "In Game"
              : status === "finished"
                ? "Finished"
                : playerCount >= maxPlayers
                  ? "Full"
                  : status === "waiting"
                    ? "Waiting"
                    : "Unavailable";

          return (
            <View key={roomId} style={styles.roomCard}>
              <View style={styles.cardTop}>
                <View style={styles.roomInfo}>
                  <View style={styles.roomIcon}>
                    <Text style={styles.roomNumber}>
                      {String(index + 1).padStart(2, "0")}
                    </Text>
                  </View>

                  <View style={styles.roomDetails}>
                    <Text style={styles.roomTitle}>{roomId}</Text>
                    <Text style={styles.roomSubtitle}>Public Auction Room</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    isWaiting ? styles.waitingBadge : styles.otherBadge,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      isWaiting ? styles.waitingDot : styles.otherDot,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      isWaiting ? styles.waitingText : styles.otherText,
                    ]}
                  >
                    {statusLabel}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBottom}>
                <View style={styles.playerInfo}>
                  <Text style={styles.playerCount}>
                    {playerCount}
                    <Text style={styles.playerTotal}> / {maxPlayers}</Text>
                  </Text>
                  <Text style={styles.playerLabel}>Players joined</Text>
                </View>

                <View style={styles.playerSlots}>
                  {Array.from({ length: maxPlayers }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.playerSlot,
                        i < playerCount && styles.filledSlot,
                      ]}
                    />
                  ))}
                </View>

                <TouchableOpacity
                  style={[
                    styles.joinButton,
                    !isWaiting && styles.disabledButton,
                  ]}
                  disabled={!isWaiting || joiningRoom !== ""}
                  onPress={() => handleJoinRoom(roomId)}
                  activeOpacity={0.8}
                >
                  {isJoining ? (
                    <ActivityIndicator color="#07111F" />
                  ) : (
                    <Text style={styles.joinButtonText}>
                      {isWaiting ? "JOIN" : "—"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#0B1020",
    overflow: "hidden",
  },

  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 25,
    paddingBottom: 40,
  },

  headerSection: {
    marginBottom: 28,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  subtitle: {
    color: "#91A4BA",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },

  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },

  roomCount: {
    color: "#00D9FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  roomCard: {
    backgroundColor: "#102137",
    borderWidth: 1,
    borderColor: "#1C3852",
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
  },

  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  roomInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  roomIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#173B55",
    borderWidth: 1,
    borderColor: "#24536D",
    justifyContent: "center",
    alignItems: "center",
  },

  roomNumber: {
    color: "#00D9FF",
    fontSize: 15,
    fontWeight: "900",
  },

  roomDetails: {
    gap: 4,
  },

  roomTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  roomSubtitle: {
    color: "#8297AE",
    fontSize: 11,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  waitingBadge: {
    backgroundColor: "#123B3B",
  },

  otherBadge: {
    backgroundColor: "#263447",
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 10,
  },

  waitingDot: {
    backgroundColor: "#46E6A5",
  },

  otherDot: {
    backgroundColor: "#8297AE",
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  waitingText: {
    color: "#46E6A5",
  },

  otherText: {
    color: "#A8B7CA",
  },

  cardDivider: {
    height: 1,
    backgroundColor: "#20364B",
    marginVertical: 15,
  },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  playerInfo: {
    gap: 3,
  },

  playerCount: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
  },

  playerTotal: {
    color: "#8195AA",
    fontSize: 13,
    fontWeight: "500",
  },

  playerLabel: {
    color: "#8195AA",
    fontSize: 10,
  },

  playerSlots: {
    flexDirection: "row",
    gap: 4,
  },

  playerSlot: {
    width: 8,
    height: 19,
    borderRadius: 5,
    backgroundColor: "#263B50",
  },

  filledSlot: {
    backgroundColor: "#00D9FF",
  },

  joinButton: {
    backgroundColor: "#00D9FF",
    paddingHorizontal: 19,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 78,
    alignItems: "center",
    justifyContent: "center",
  },

  joinButtonText: {
    color: "#07111F",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
  },

  disabledButton: {
    backgroundColor: "#26394D",
  },
});
