import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { ref, get, runTransaction, remove } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import Header from "../components/Header";
import { db, firestore } from "../utils/Firebase";
import { useAuth } from "../context/Authcontext";
import { MAX_PLAYERS, ROOM_STATUS } from "../Rooms/constants";

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

const tap = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    // haptics not available, ignore
  }
};

export default function Playwithfriends() {
  const router = useRouter();
  const { user } = useAuth();

  const [creating, setCreating] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

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

  // ---------- CREATE ROOM ----------
  const handleCreateRoom = async () => {
    if (creating) return;

    if (!user?.uid) {
      Toast.show({ type: "error", text1: "Please log in to create a room." });
      return;
    }

    const balance = Number(user.coins);
    if (!Number.isFinite(balance) || balance <= 0) {
      Toast.show({ type: "error", text1: "You need coins to create a room." });
      return;
    }

    if (user.activeRoom) {
      Toast.show({ type: "error", text1: "Leave your current room first." });
      return;
    }

    setCreating(true);

    try {
      let newCode = "";

      // 5 digit code banao, aur check karo ke pehle se use mein na ho
      for (let attempt = 0; attempt < 5 && !newCode; attempt++) {
        const candidate = String(Math.floor(10000 + Math.random() * 90000));

        const result = await runTransaction(
          ref(db, `Rooms/${candidate}`),
          (room) => {
            if (room) return; // code pehle se use mein hai

            return {
              status: ROOM_STATUS.WAITING,
              maxPlayers: MAX_PLAYERS,
              isPrivate: true,
              hostId: user.uid,
              createdAt: Date.now(),
              players: {
                [user.uid]: {
                  uid: user.uid,
                  name: user.name || "Player",
                  playerId: user.playerId || "",
                  coins: balance,
                  profilePic: user.profilePic || "",
                  isConnected: true,
                  seatIndex: 0,
                },
              },
            };
          },
        );

        if (result.committed) newCode = candidate;
      }

      if (!newCode) {
        Toast.show({
          type: "error",
          text1: "Could not create a room. Try again.",
        });
        return;
      }

      try {
        await updateDoc(doc(firestore, "users", user.uid), {
          activeRoom: newCode,
        });
      } catch (error) {
        // Firestore fail hua to khali room na atke
        await remove(ref(db, `Rooms/${newCode}`)).catch(() => {});
        throw error;
      }

      // Room ban gaya: seedha main Room screen par
      router.push({ pathname: "/Room", params: { roomId: newCode } });
    } catch (error) {
      console.log("Create room error:", error);
      Toast.show({ type: "error", text1: "Failed to create room. Try again." });
    } finally {
      setCreating(false);
    }
  };

  // ---------- JOIN ROOM (modal) ----------
  const handleJoinRoom = () => {
    setCode("");
    setJoinVisible(true);
  };

  const closeJoin = () => {
    if (joining) return;
    setJoinVisible(false);
  };

  const submitJoin = async () => {
    if (joining) return;

    if (!user?.uid) {
      Toast.show({ type: "error", text1: "Please log in to join a room." });
      return;
    }

    if (!/^\d{5}$/.test(code)) {
      Toast.show({ type: "error", text1: "Enter the 5-digit room code." });
      return;
    }

    setJoining(true);

    try {
      // Code RTDB mein check karo
      const snap = await get(ref(db, `Rooms/${code}`));
      const room = snap.val();

      if (!room || !room.isPrivate) {
        Toast.show({
          type: "error",
          text1: "Room not found",
          text2: "Check the code and try again.",
        });
        return;
      }

      const uid = user.uid;
      const alreadyIn = !!room.players?.[uid];

      if (!alreadyIn) {
        if (room.status !== ROOM_STATUS.WAITING) {
          Toast.show({ type: "error", text1: "Game already started" });
          return;
        }

        const count = Object.keys(room.players || {}).length;
        if (count >= (room.maxPlayers || MAX_PLAYERS)) {
          Toast.show({ type: "error", text1: "Room is full" });
          return;
        }
      }

      const balance = Number(user.coins);

      if (!Number.isFinite(balance) || balance <= 0) {
        Toast.show({ type: "error", text1: "You need coins to join a room." });
        return;
      }

      if (user.activeRoom && user.activeRoom !== code) {
        Toast.show({ type: "error", text1: "Leave your current room first." });
        return;
      }

      // Seat assign aur join (transaction)
      const result = await runTransaction(
        ref(db, `Rooms/${code}`),
        (current) => {
          if (!current) return current;

          const players = current.players || {};

          // Pehle se room mein hai: kuch change nahi
          if (players[uid]) return current;

          if (current.status !== ROOM_STATUS.WAITING) return;

          const maxPlayers = current.maxPlayers || MAX_PLAYERS;
          if (Object.keys(players).length >= maxPlayers) return;

          const usedSeats = Object.values(players).map((p) => p.seatIndex);
          let seatIndex = 0;
          while (usedSeats.includes(seatIndex)) seatIndex++;
          if (seatIndex >= maxPlayers) return;

          return {
            ...current,
            players: {
              ...players,
              [uid]: {
                uid,
                name: user.name || "Player",
                playerId: user.playerId || "",
                coins: balance,
                isConnected: true,
                seatIndex,
              },
            },
            hostId: current.hostId || uid,
          };
        },
      );

      if (!result.committed || !result.snapshot.val()?.players?.[uid]) {
        Toast.show({ type: "error", text1: "Room is full or not available." });
        return;
      }

      await updateDoc(doc(firestore, "users", uid), { activeRoom: code });

      setJoinVisible(false);
      router.push({ pathname: "/Room", params: { roomId: code } });
    } catch (error) {
      console.log("Join room error:", error);
      Toast.show({ type: "error", text1: "Failed to join room. Try again." });
    } finally {
      setJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Background glow */}
        <Animated.View style={[styles.glow, { opacity: pulse }]} />
        <View style={styles.bottomGlow} />

        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PLAY TOGETHER</Text>

          <Text style={styles.title}>
            Play with{"\n"}
            <Text style={styles.goldText}>Friends</Text>
          </Text>

          <Text style={styles.subtitle}>
            Create or join a room and outbid your friends!
          </Text>
        </View>

        {/* Create Room */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.createWrap, creating && styles.disabled]}
          onPress={() => {
            tap();
            handleCreateRoom();
          }}
          disabled={creating}
        >
          <LinearGradient
            colors={[COLORS.goldLight, COLORS.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.createButton}
          >
            <View style={styles.buttonIcon}>
              {creating ? (
                <ActivityIndicator color={COLORS.dark} />
              ) : (
                <Ionicons name="add-circle" size={27} color={COLORS.dark} />
              )}
            </View>

            <View style={styles.buttonContent}>
              <Text style={styles.createTitle}>Create Room</Text>
              <Text style={styles.createSubtitle}>
                {creating ? "Creating room..." : "Start a new private auction"}
              </Text>
            </View>

            <Ionicons name="hammer" size={23} color={COLORS.dark} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Join Room */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.joinButton}
          onPress={() => {
            tap();
            handleJoinRoom();
          }}
        >
          <View style={styles.joinIcon}>
            <Ionicons name="enter-outline" size={27} color={COLORS.gold} />
          </View>

          <View style={styles.buttonContent}>
            <Text style={styles.joinTitle}>Join Room</Text>
            <Text style={styles.joinSubtitle}>Enter a friend's room code</Text>
          </View>

          <Ionicons name="arrow-forward" size={23} color={COLORS.gold} />
        </TouchableOpacity>

        {/* Why Play Together */}
        <View style={styles.whySection}>
          <Text style={styles.sectionTitle}>WHY PLAY TOGETHER?</Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="people" size={24} color={COLORS.gold} />
              </View>
              <Text style={styles.featureTitle}>Friends</Text>
              <Text style={styles.featureDescription}>
                Play with your squad
              </Text>
            </View>

            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="flame" size={24} color={COLORS.gold} />
              </View>
              <Text style={styles.featureTitle}>Rivalry</Text>
              <Text style={styles.featureDescription}>Outbid your friends</Text>
            </View>

            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="trophy" size={24} color={COLORS.gold} />
              </View>
              <Text style={styles.featureTitle}>Big Wins</Text>
              <Text style={styles.featureDescription}>Compete and win</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>BID IT. WIN IT. TOGETHER.</Text>
          <View style={styles.footerLine} />
        </View>
      </ScrollView>

      {/* JOIN CODE MODAL */}
      <Modal
        visible={joinVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeJoin}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalIcon}>
              <Ionicons name="key" size={22} color={COLORS.gold} />
            </View>

            <Text style={styles.modalTitle}>Join a room</Text>
            <Text style={styles.modalSubtitle}>
              Enter the 5-digit code from your friend.
            </Text>

            <TextInput
              value={code}
              onChangeText={(t) =>
                setCode(t.replace(/[^0-9]/g, "").slice(0, 5))
              }
              placeholder="00000"
              placeholderTextColor="#3A465C"
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
              selectionColor={COLORS.gold}
              style={styles.codeInput}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeJoin}
                disabled={joining}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmWrap,
                  (code.length !== 5 || joining) && styles.disabled,
                ]}
                onPress={() => {
                  tap();
                  submitJoin();
                }}
                disabled={code.length !== 5 || joining}
              >
                <LinearGradient
                  colors={[COLORS.goldLight, COLORS.goldDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmButton}
                >
                  {joining ? (
                    <ActivityIndicator color={COLORS.dark} />
                  ) : (
                    <Text style={styles.confirmText}>JOIN</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  glow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: COLORS.goldDark,
    top: -140,
    right: -100,
  },

  bottomGlow: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#7C3AED",
    opacity: 0.1,
    bottom: -120,
    left: -90,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 35,
  },

  heading: {
    marginBottom: 24,
  },

  eyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 9,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40,
  },

  goldText: {
    color: COLORS.gold,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },

  createWrap: {
    borderRadius: 18,
    marginBottom: 13,
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },

  createButton: {
    minHeight: 76,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  buttonIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "rgba(26, 18, 0, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  buttonContent: {
    flex: 1,
  },

  createTitle: {
    color: COLORS.dark,
    fontSize: 17,
    fontWeight: "900",
  },

  createSubtitle: {
    color: "#5C4510",
    fontSize: 11,
    marginTop: 4,
  },

  joinButton: {
    minHeight: 76,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.55)",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },

  joinIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  joinTitle: {
    color: COLORS.gold,
    fontSize: 17,
    fontWeight: "900",
  },

  joinSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 4,
  },

  whySection: {
    marginBottom: 27,
  },

  sectionTitle: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.7,
    marginBottom: 17,
  },

  features: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },

  feature: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 5,
    alignItems: "center",
  },

  featureIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  featureTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  featureDescription: {
    color: "#8996AA",
    fontSize: 9,
    textAlign: "center",
    marginTop: 5,
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#273247",
  },

  footerText: {
    color: COLORS.gold,
    opacity: 0.8,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  disabled: {
    opacity: 0.45,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.55)",
    borderRadius: 20,
    padding: 20,
  },

  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 6,
    marginBottom: 18,
  },

  codeInput: {
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.bg,
    color: COLORS.gold,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 12,
    textAlign: "center",
    marginBottom: 18,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },

  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: "800",
  },

  confirmWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },

  confirmButton: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmText: {
    color: COLORS.dark,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
