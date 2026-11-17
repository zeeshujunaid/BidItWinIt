import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { ref, get, runTransaction, remove } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import Header from "../components/Header";
import { db, firestore } from "../utils/Firebase";
import { useAuth } from "../context/Authcontext";
import { MAX_PLAYERS, ROOM_STATUS } from "../Rooms/constants";

export default function Playwithfriends() {
  const router = useRouter();
  const { user } = useAuth();

  const [creating, setCreating] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

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
        {/* Heading */}
        <View style={styles.heading}>
          <Text style={styles.eyebrow}>PLAY TOGETHER</Text>

          <Text style={styles.title}>
            Play with{"\n"}
            <Text style={styles.goldText}>Friends</Text>
          </Text>

          <Text style={styles.subtitle}>
            Create or join a room and start bidding together!
          </Text>
        </View>

        {/* Create Room */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.createButton, creating && styles.disabled]}
          onPress={handleCreateRoom}
          disabled={creating}
        >
          <View style={styles.buttonIcon}>
            {creating ? (
              <ActivityIndicator color="#171321" />
            ) : (
              <Ionicons name="add-circle" size={27} color="#171321" />
            )}
          </View>

          <View style={styles.buttonContent}>
            <Text style={styles.createTitle}>Create Room</Text>
            <Text style={styles.createSubtitle}>
              {creating ? "Creating room..." : "Start a new private auction"}
            </Text>
          </View>

          <Ionicons name="arrow-forward" size={23} color="#171321" />
        </TouchableOpacity>

        {/* Join Room */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.joinButton}
          onPress={handleJoinRoom}
        >
          <View style={styles.joinIcon}>
            <Ionicons name="enter-outline" size={27} color="#F5C76B" />
          </View>

          <View style={styles.buttonContent}>
            <Text style={styles.joinTitle}>Join Room</Text>
            <Text style={styles.joinSubtitle}>Enter a friend's room</Text>
          </View>

          <Ionicons name="arrow-forward" size={23} color="#F5C76B" />
        </TouchableOpacity>

        {/* Why Play Together */}
        <View style={styles.whySection}>
          <Text style={styles.sectionTitle}>WHY PLAY TOGETHER?</Text>

          <View style={styles.features}>
            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="people" size={24} color="#F5C76B" />
              </View>
              <Text style={styles.featureTitle}>Friends</Text>
              <Text style={styles.featureDescription}>
                Play with your squad
              </Text>
            </View>

            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="game-controller" size={24} color="#F5C76B" />
              </View>
              <Text style={styles.featureTitle}>More Fun</Text>
              <Text style={styles.featureDescription}>Enjoy every auction</Text>
            </View>

            <View style={styles.feature}>
              <View style={styles.featureIcon}>
                <Ionicons name="trophy" size={24} color="#F5C76B" />
              </View>
              <Text style={styles.featureTitle}>Big Wins</Text>
              <Text style={styles.featureDescription}>Compete and win</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>BID IT. WIN IT. TOGETHER.</Text>
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
                  styles.confirmButton,
                  (code.length !== 5 || joining) && styles.disabled,
                ]}
                onPress={submitJoin}
                disabled={code.length !== 5 || joining}
              >
                {joining ? (
                  <ActivityIndicator color="#171321" />
                ) : (
                  <Text style={styles.confirmText}>Join</Text>
                )}
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
    backgroundColor: "#0B1020",
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 25,
    paddingBottom: 35,
  },

  heading: {
    marginBottom: 22,
  },

  eyebrow: {
    color: "#D9A441",
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
    color: "#F5C76B",
  },

  subtitle: {
    color: "#9BA8BD",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },

  createButton: {
    minHeight: 76,
    backgroundColor: "#F5C76B",
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  buttonIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#E5B654",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  buttonContent: {
    flex: 1,
  },

  createTitle: {
    color: "#171321",
    fontSize: 17,
    fontWeight: "900",
  },

  createSubtitle: {
    color: "#59451F",
    fontSize: 11,
    marginTop: 4,
  },

  joinButton: {
    minHeight: 76,
    backgroundColor: "#151B2D",
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#A77B32",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },

  joinIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: "#302A25",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  joinTitle: {
    color: "#F5C76B",
    fontSize: 17,
    fontWeight: "900",
  },

  joinSubtitle: {
    color: "#9BA8BD",
    fontSize: 11,
    marginTop: 4,
  },

  whySection: {
    marginBottom: 27,
  },

  sectionTitle: {
    color: "#F5C76B",
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
    backgroundColor: "#151B2D",
    borderWidth: 1,
    borderColor: "#29344A",
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 5,
    alignItems: "center",
  },

  featureIcon: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#302A25",
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
    alignItems: "center",
  },

  footerText: {
    color: "#A77B32",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },

  disabled: {
    opacity: 0.45,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },

  modalBox: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#151B2D",
    borderWidth: 1.5,
    borderColor: "#A77B32",
    borderRadius: 20,
    padding: 20,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: "#9BA8BD",
    fontSize: 12,
    marginTop: 6,
    marginBottom: 18,
  },

  codeInput: {
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A77B32",
    backgroundColor: "#0B1020",
    color: "#F5C76B",
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
    borderColor: "#29344A",
    alignItems: "center",
    justifyContent: "center",
  },

  cancelText: {
    color: "#9BA8BD",
    fontSize: 14,
    fontWeight: "800",
  },

  confirmButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: "#F5C76B",
    alignItems: "center",
    justifyContent: "center",
  },

  confirmText: {
    color: "#171321",
    fontSize: 14,
    fontWeight: "900",
  },
});
