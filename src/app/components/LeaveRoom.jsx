import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuth } from "../context/Authcontext";
import { leaveRooms } from "../Rooms/leaveRooms";
export default function LeaveRoom({
  finalCoins,
  showCompleted = false,
  showLastPlayerModal = false,
}) {
  const { roomId } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [leaving, setLeaving] = useState(false);

  const handleLeaveRoom = () => {
    if (leaving || !user?.uid || !roomId) return;

    Alert.alert("Leave Game", "Are you sure you want to leave?", [
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
            const result = await leaveRooms(roomId, user.uid, finalCoins);

            if (!result.ok) {
              Alert.alert(
                "Cannot Leave Yet",
                "You are the highest bidder. Another player must outbid you before you can leave.",
              );
              return;
            }

            router.replace("/(drawer)/Home");
          } catch (error) {
            console.log("Leave Game Error:", error);
            Alert.alert(
              "Leave Failed",
              "Something went wrong. Please try again.",
            );
          } finally {
            setLeaving(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={showCompleted ? styles.container : null}>
      {/* Full-screen modal for the only remaining player */}
      <Modal
        visible={showLastPlayerModal && !leaving}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.lastPlayerModal}>
          <View style={styles.lastPlayerContent}>
            <Ionicons name="alert-circle-outline" size={65} color="#FACC15" />

            <Text style={styles.lastPlayerTitle}>Game Ended!</Text>

            <Text style={styles.lastPlayerMessage}>
              You are the only player left. The game has ended, and your
              reserved coins have been refunded.
            </Text>

            <Text style={styles.lastPlayerSubtext}>
              Leave the game to return to Home.
            </Text>

            <TouchableOpacity
              style={[styles.leaveButton, leaving && styles.disabledButton]}
              onPress={handleLeaveRoom}
              disabled={leaving}
              activeOpacity={0.7}
            >
              <Ionicons name="exit-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.leaveLabel}>LEAVE GAME</Text>
          </View>
        </View>
      </Modal>

      {/* Loading modal */}
      <Modal
        visible={leaving}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#38BDF8" />

          <Text style={styles.loadingText}>Leaving Game...</Text>

          <Text style={styles.loadingSubtext}>
            Please wait while we update your game data.
          </Text>
        </View>
      </Modal>

      {showCompleted && (
        <>
          <Text style={styles.title}>Game Completed!</Text>
          <Text style={styles.message}>All items have been auctioned.</Text>
        </>
      )}

      {/* Normal leave button; hidden when the full-screen modal is active */}
      {!showLastPlayerModal && (
        <TouchableOpacity
          style={[styles.leaveButton, leaving && styles.disabledButton]}
          onPress={handleLeaveRoom}
          disabled={leaving}
          activeOpacity={0.7}
        >
          <Ionicons name="exit-outline" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111F",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    marginBottom: 12,
  },

  message: {
    color: "#A8B7CA",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 25,
  },

  disabledButton: {
    opacity: 0.5,
  },

  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 17, 31, 0.96)",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  loadingText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 20,
  },

  loadingSubtext: {
    color: "#A8B7CA",
    fontSize: 12,
    marginTop: 8,
    textAlign: "center",
  },

  lastPlayerModal: {
    flex: 1,
    backgroundColor: "#07111F",
    justifyContent: "center",
    alignItems: "center",
    padding: 25,
  },

  lastPlayerContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#102A40",
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
  },

  lastPlayerTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 20,
    marginBottom: 12,
  },

  lastPlayerMessage: {
    color: "#CBD5E1",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
  },

  lastPlayerSubtext: {
    color: "#38BDF8",
    fontSize: 13,
    marginTop: 20,
    marginBottom: 25,
    textAlign: "center",
  },

  leaveLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 10,
    letterSpacing: 1,
  },

  leaveButton: {
    width: 55,
    height: 55,
    backgroundColor: "#8D2438",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0445E",
  },
});
