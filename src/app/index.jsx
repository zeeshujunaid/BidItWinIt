import {
  View,
  Text,
  ActivityIndicator,
  StatusBar,
  Image,
  StyleSheet,
  Animated,
} from "react-native";
import Bubbels from "./components/Bubbels";
import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ref, get, update } from "firebase/database";
import { useAuth } from "../app/context/Authcontext";
import { db } from "../app/utils/Firebase";

const COLORS = {
  bg: "#0B1020",
  card: "#131D31",
  gold: "#FBBF24",
  goldDark: "#F59E0B",
  border: "#293A56",
  muted: "#94A3B8",
};

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // UI-only animations
  const pulse = useRef(new Animated.Value(0.1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const footerBlink = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.28,
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

    const blinkLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(footerBlink, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(footerBlink, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start();

    glowLoop.start();
    blinkLoop.start();

    return () => {
      glowLoop.stop();
      blinkLoop.stop();
    };
  }, [pulse, fadeIn, footerBlink]);

  useEffect(() => {
    if (loading) return;

    let isActive = true;

    const checkSession = async () => {
      try {
        if (!user) {
          router.replace("/(auth)/Login");
          return;
        }

        // Active room check
        const activeRoom = user.activeRoom;

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

        await update(ref(db, `Rooms/${activeRoom}/players/${user.uid}`), {
          isConnected: true,
        });

        if (!isActive) return;

        if (room.status === "waiting") {
          router.replace({ pathname: "/Room", params: { roomId: activeRoom } });
        } else {
          // playing ya completed: Game screen khud result/modal dikha dega
          router.replace({ pathname: "/Game", params: { roomId: activeRoom } });
        }
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

      <Bubbels />
      <Animated.View style={[styles.glowTop, { opacity: pulse }]} />
      <View style={styles.glowBottom} />

      <Animated.View style={[styles.content, { opacity: fadeIn }]}>
        <Image
          source={require("../../assets/images/textlogo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.tagline}>THE ULTIMATE BIDDING EXPERIENCE</Text>

        <View style={styles.divider} />

        <Text style={styles.heading}>
          Your Bid. Your Strategy.{"\n"}
          <Text style={styles.highlight}>Your Win!</Text>
        </Text>

        <Text style={styles.description}>
          Challenge your friends, place your bids, and compete to win exciting
          items.
        </Text>

        <View style={styles.steps}>
          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Ionicons name="enter" size={18} color={COLORS.gold} />
            </View>
            <Text style={styles.stepNumber}>01</Text>
            <Text style={styles.stepText}>Join a Room</Text>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Ionicons name="hammer" size={18} color={COLORS.gold} />
            </View>
            <Text style={styles.stepNumber}>02</Text>
            <Text style={styles.stepText}>Place Your Bid</Text>
          </View>

          <View style={styles.stepDivider} />

          <View style={styles.step}>
            <View style={styles.stepIcon}>
              <Ionicons name="trophy" size={18} color={COLORS.gold} />
            </View>
            <Text style={styles.stepNumber}>03</Text>
            <Text style={styles.stepText}>Win Items</Text>
          </View>
        </View>

        <ActivityIndicator
          size="large"
          color={COLORS.gold}
          style={styles.spinner}
        />

        <Animated.Text style={[styles.footer, { opacity: footerBlink }]}>
          LET THE BIDDING BEGIN!
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
    overflow: "hidden",
  },

  glowTop: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: COLORS.goldDark,
    top: -160,
    right: -120,
  },

  glowBottom: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#7C3AED",
    opacity: 0.12,
    bottom: -120,
    left: -120,
  },

  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  logo: {
    width: 250,
    height: 110,
  },

  tagline: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 5,
  },

  divider: {
    width: 45,
    height: 3,
    backgroundColor: COLORS.gold,
    borderRadius: 5,
    marginTop: 30,
    marginBottom: 25,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 38,
  },

  highlight: {
    color: COLORS.gold,
  },

  description: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 15,
    paddingHorizontal: 10,
  },

  steps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 40,
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
  },

  step: {
    alignItems: "center",
    flex: 1,
  },

  stepIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  stepDivider: {
    width: 1,
    height: 52,
    backgroundColor: "#273247",
  },

  stepNumber: {
    color: COLORS.gold,
    fontSize: 19,
    fontWeight: "900",
  },

  stepText: {
    color: "#C5CDDA",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 6,
    textAlign: "center",
  },

  spinner: {
    marginTop: 45,
  },

  footer: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 15,
  },
});
