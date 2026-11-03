import {
  View,
  Text,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
} from "react-native";

import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ref, get, update } from "firebase/database";

import { useAuth } from "../app/context/Authcontext";
import { db } from "../app/utils/Firebase";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checkingRoom, setCheckingRoom] = useState(true);

  useEffect(() => {
    if (loading) return;

    let isActive = true;

    const checkSession = async () => {
      try {
        // User login nahi hai
        if (!user) {
          router.replace("/(auth)/Login");
          return;
        }

        // Active room check
        const activeRoom = user.activeRoom;

        console.log("CURRENT USER:", user.uid);
        console.log("USER NAME:", user.name);
        console.log("ACTIVE ROOM:", user.activeRoom);

        if (!activeRoom) {
          router.replace("/(drawer)/Home");
          return;
        }

        // RTDB room check
        const roomRef = ref(db, `Rooms/${activeRoom}`);
        const snapshot = await get(roomRef);

        if (!snapshot.exists()) {
          router.replace("/(drawer)/Home");
          return;
        }

        const room = snapshot.val();


        console.log("ROOM EXISTS:", snapshot.exists());
        console.log("ROOM PLAYERS:", room.players);
        console.log("PLAYER FOUND:", room.players?.[user.uid]);
        console.log("AUCTION STATUS:", room.auctionStatus);

        // Player membership check
        const player = room.players?.[user.uid];

        if (!player) {
          router.replace("/(drawer)/Home");
          return;
        }

        // Finished game check
        if (room.auctionStatus === "finished") {
          router.replace("/(drawer)/Home");
          return;
        }

        // Reconnect player
        await update(ref(db, `Rooms/${activeRoom}/players/${user.uid}`), {
          isConnected: true,
        });

        if (!isActive) return;

        // Direct Game screen
        router.replace({
          pathname: "/Game",
          params: { roomId: activeRoom },
        });
      } catch (error) {
        console.log("Session checking error:", error);

        if (isActive) {
          router.replace("/(drawer)/Home");
        }
      }
    };

    checkSession();

    return () => {
      isActive = false;
    };
  }, [user, loading]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.loaderContent}>
        <ActivityIndicator size="large" color="#38BDF8" />

        <Text style={styles.loaderText}>CHECKING YOUR GAME...</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    overflow: "hidden",
  },

  glowTop: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#164EAD",
    opacity: 0.17,
    top: -160,
    right: -100,
  },

  glowBottom: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#7C3AED",
    opacity: 0.12,
    bottom: -150,
    left: -130,
  },

  loaderContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loaderText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 18,
  },
});
