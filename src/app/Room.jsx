import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  Alert,
} from "react-native";
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
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
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
              style={[styles.startButton, starting && styles.disabledButton]}
              onPress={handleStartGame}
              disabled={starting}
              activeOpacity={0.8}
            >
              <Text style={styles.startButtonText}>
                {starting ? "STARTING..." : "▶ START"}
              </Text>
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

  roomName: {
    color: "#00D9FF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 5,
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
