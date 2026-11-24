import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { useAuth } from "../context/Authcontext";
import { ref, onValue } from "firebase/database";
import { db } from "../utils/Firebase";
import Header from "../components/Header";
import Bubbels from "../components/Bubbels";
import Loader from "../components/Loader";
import { joinRoom } from "../Rooms/joinRoom";
import { ROOM_NAMES } from "../Rooms/constants";
import { cleanupStaleRoom, isRoomStale } from "../Rooms/cleanupRoom";

const COLORS = {
  bg: "#0B1020",
  gold: "#FBBF24",
  goldLight: "#FDE047",
  goldDark: "#F59E0B",
  card: "#131D31",
  line: "#273247",
  muted: "#94A3B8",
};

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
        const data = snapshot.val() || {};

        setRooms(data);
        setLoading(false);

        // Atke hue rooms ko reset karo
        ROOM_NAMES.forEach((id) => {
          if (isRoomStale(data[id])) cleanupStaleRoom(id);
        });
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

  const JOIN_ERRORS = {
    no_coins: [
      "Insufficient Coins",
      "You need a valid coin balance to join a room.",
    ],
    in_other_room: ["Already in a room", "Please leave that room first."],
    unavailable: ["Room is full or not available.", ""],
  };

  const handleJoinRoom = async (roomId) => {
    if (joiningRoom) return;

    if (!user?.uid) {
      Toast.show({ type: "error", text1: "Please log in to join a room." });
      return;
    }

    setJoiningRoom(roomId);

    try {
      const result = await joinRoom(roomId, user);

      if (!result.ok) {
        const [text1, text2] = JOIN_ERRORS[result.reason];
        Toast.show({ type: "error", text1, text2 });
        return;
      }

      router.push({ pathname: "/Room", params: { roomId } });
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

  const onJoinPress = (roomId) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // haptics not available, ignore
    }
    handleJoinRoom(roomId);
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
          <Text style={styles.heading}>
            Online <Text style={styles.headingGold}>Play</Text>
          </Text>
          <Text style={styles.subtitle}>
            Pick a room, outbid the rest and keep the profit.
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
              : status === "finished" || status === "completed"
                ? "Finished"
                : playerCount >= maxPlayers
                  ? "Full"
                  : status === "waiting"
                    ? "Waiting"
                    : "Unavailable";

          return (
            <View
              key={roomId}
              style={[styles.roomCard, isWaiting && styles.roomCardOpen]}
            >
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
                  <Text style={styles.playerLabel}>Bidders joined</Text>
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
                    styles.joinButtonWrap,
                    !isWaiting && styles.disabledButton,
                  ]}
                  disabled={!isWaiting || joiningRoom !== ""}
                  onPress={() => onJoinPress(roomId)}
                  activeOpacity={0.85}
                >
                  {isWaiting ? (
                    <LinearGradient
                      colors={[COLORS.goldLight, COLORS.goldDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.joinButton}
                    >
                      {isJoining ? (
                        <ActivityIndicator color="#1A1200" />
                      ) : (
                        <View style={styles.joinContent}>
                          <Ionicons name="hammer" size={15} color="#1A1200" />
                          <Text style={styles.joinButtonText}>JOIN</Text>
                        </View>
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={styles.joinButton}>
                      {isJoining ? (
                        <ActivityIndicator color="#1A1200" />
                      ) : (
                        <Text style={styles.disabledText}>—</Text>
                      )}
                    </View>
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
    backgroundColor: COLORS.bg,
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
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  headingGold: {
    color: COLORS.gold,
  },

  subtitle: {
    color: COLORS.muted,
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
    fontWeight: "800",
  },

  roomCount: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },

  roomCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "#293A56",
    borderRadius: 17,
    padding: 16,
    marginBottom: 14,
  },

  roomCardOpen: {
    borderColor: "rgba(251, 191, 36, 0.45)",
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
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  roomNumber: {
    color: COLORS.gold,
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
    backgroundColor: COLORS.line,
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
    backgroundColor: COLORS.gold,
  },

  joinButtonWrap: {
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 84,
  },

  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 84,
    alignItems: "center",
    justifyContent: "center",
  },

  joinContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  joinButtonText: {
    color: "#1A1200",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.9,
  },

  disabledButton: {
    backgroundColor: "#26394D",
  },

  disabledText: {
    color: "#8297AE",
    fontSize: 12,
    fontWeight: "900",
  },
});
