import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import Instruction from "./components/Instruction";
import Toast from "react-native-toast-message";
import { db } from "./utils/Firebase";
import { ref, onValue } from "firebase/database";
import Loader from "./components/Loader";
import Bubbels from "./components/Bubbels";
import { useAuth } from "./context/Authcontext";
import LeaveRoom from "./components/LeaveRoom";
import { startGame } from "./Rooms/startGame";
import { useRoomPresence } from "./Hooks/useRoomPresence";
import { useBlockBack } from "./Hooks/useBlockBack";

const COLORS = {
  bg: "#0B1020",
  card: "#131D31",
  gold: "#FBBF24",
  goldLight: "#FDE047",
  goldDark: "#F59E0B",
  border: "#293A56",
  muted: "#94A3B8",
  dark: "#1A1200",
};

export default function Room() {
  const { user, loading: authLoading } = useAuth();
  const { roomId } = useLocalSearchParams();
  useRoomPresence(roomId, user?.uid, { removeDisconnected: true });
  useBlockBack();
  const currentUserId = user?.uid || "";
  const router = useRouter();
  const [hostId, setHostId] = useState("");
  const [roomStatus, setRoomStatus] = useState("waiting");
  const [players, setPlayers] = useState([]);
  const [starting, setStarting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);

  // UI-only: pulsing gold spotlight
  const pulse = useRef(new Animated.Value(0.1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.26,
          duration: 2200,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.1,
          duration: 2200,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => {
    if (loading || !currentUserId) return;
    if (!players.some((p) => p.uid === currentUserId)) {
      router.replace("/(drawer)/Home");
    }
  }, [loading, players, currentUserId]);

  const handleStartGame = async () => {
    if (starting) return;

    if (players.length < 2) {
      Toast.show({
        type: "error",
        text1: "At least 2 players required to start the game.",
      });
      return;
    }

    setStarting(true);

    try {
      const result = await startGame(roomId, currentUserId);

      if (!result.ok) {
        Toast.show({
          type: "error",
          text1:
            result.reason === "no_items"
              ? "No game items found."
              : "Unable to start game.",
        });
      }
      // Success par kuch nahi karna: room listener khud /Game bhej dega
    } catch (error) {
      console.log("Start Game Error:", error);
      Toast.show({
        type: "error",
        text1: "Failed to start game. Please try again.",
      });
    } finally {
      setStarting(false);
    }
  };

  const onStartPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // haptics not available, ignore
    }
    handleStartGame();
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

  if (loading) {
    return <Loader />;
  }

  return (
    <View style={styles.screen}>
      <Bubbels />
      <Animated.View style={[styles.glowTop, { opacity: pulse }]} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Online Room</Text>

            <View style={styles.roomCodeChip}>
              <Ionicons name="key" size={12} color={COLORS.gold} />
              <Text style={styles.roomName}>{roomId}</Text>
            </View>
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
          <Text
            style={[styles.waiting, players.length >= 5 && styles.waitingReady]}
          >
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

              const avatar = player?.profilePic || null;

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
                        <Ionicons
                          name="add"
                          size={24}
                          color="rgba(251, 191, 36, 0.7)"
                        />
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
              style={[styles.startWrap, starting && styles.disabledButton]}
              onPress={onStartPress}
              disabled={starting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startButton}
              >
                <Ionicons
                  name={starting ? "hourglass" : "hammer"}
                  size={20}
                  color={COLORS.dark}
                />
                <Text style={styles.startButtonText}>
                  {starting ? "STARTING..." : "START THE AUCTION"}
                </Text>
              </LinearGradient>
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
    backgroundColor: COLORS.bg,
    overflow: "hidden",
  },

  glowTop: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.goldDark,
    top: -150,
    right: -110,
  },

  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 35,
  },
  header: {
    width: "100%",
    height: 65,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    position: "relative",
  },

  headerButton: {
    width: 55,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },

  headerCenter: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },

  roomCodeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.45)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
  },

  roomName: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  countBox: {
    alignSelf: "center",
    backgroundColor: "rgba(251, 191, 36, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.45)",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 15,
  },

  count: {
    color: COLORS.gold,
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
    backgroundColor: "#1B1A14",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
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
    backgroundColor: "rgba(251, 191, 36, 0.16)",
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
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.8,
  },

  coins: {
    color: COLORS.goldLight,
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
    left: "2%",
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
    left: "61%",
    top: "14%",
  },

  seat5: {
    left: "80%",
    top: "14%",
  },

  profileBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#263D57",
    borderWidth: 3,
    borderColor: "#475569",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  activeProfile: {
    borderColor: COLORS.gold,
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

  nameTag: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.45)",
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
    color: COLORS.goldLight,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 3,
  },

  waiting: {
    color: COLORS.muted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 20,
  },

  waitingReady: {
    color: COLORS.gold,
    fontWeight: "800",
  },

  actionButtons: {
    flexDirection: "row",
    alignItems: "space-around",
    gap: 12,
    width: "100%",
    marginTop: 25,
  },

  startWrap: {
    flex: 1,
    borderRadius: 14,
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },

  startButton: {
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  startButtonText: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  disabledButton: {
    opacity: 0.6,
  },
});
