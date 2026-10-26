import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import PicChanger from "./PicChanger";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Header() {
  const [user, setUser] = useState(null);

  const handleMenuPress = () => {
    // Hamburger menu logic yahan add karenge
  };

  useEffect(() => {
    const getUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");

        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.log("Error getting user:", error);
      }
    };

    getUserData();
  }, []);

  return (
    <View style={styles.header}>
      <View style={styles.glow} />
      <View style={styles.bottomGlow} />

      {/* LEFT SIDE */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
          <View style={styles.menuLine} />
        </TouchableOpacity>

        <Image
          source={require("../../../assets/images/textlogo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.playerInfo}>
          <Text style={styles.welcomeText}>WELCOME BACK</Text>

          <Text style={styles.playerName} numberOfLines={1}>
            {user?.name || "Player"}
          </Text>

          <View style={styles.uidBadge}>
            <Text style={styles.uidLabel}>ID</Text>
            <Text style={styles.uidText}>#{user?.playerId ?? "------"}</Text>
          </View>
        </View>
      </View>

      {/* CENTER CHARACTER */}
      <View style={styles.characterContainer}>
        <View style={styles.characterGlow} />
        <PicChanger />
      </View>

      {/* RIGHT SIDE: COINS */}
      <View style={styles.rightSection}>
        <View style={styles.coinCard}>
          <View style={styles.coinIcon}>
            <Text style={styles.coinEmoji}>🪙</Text>
          </View>

          <View style={styles.coinInfo}>
            <Text style={styles.coinLabel}>YOUR COINS</Text>
            <Text style={styles.coinAmount}>
              {Number(user?.coins ?? 0).toLocaleString("en-US")}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 240,
    width: "100%",
    backgroundColor: "#0B1020",
    flexDirection: "row",
    position: "relative",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: "#263752",
  },

  glow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#164EAD",
    opacity: 0.17,
    top: -120,
    left: 30,
  },

  bottomGlow: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#7C3AED",
    opacity: 0.12,
    bottom: -125,
    left: "35%",
  },

  // LEFT SECTION
  leftSection: {
    width: "53%",
    paddingLeft: 15,
    paddingTop: 10,
    zIndex: 2,
  },

  menuButton: {
    width: 35,
    height: 30,
    borderRadius: 9,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 2,
  },

  menuLine: {
    width: 17,
    height: 2,
    borderRadius: 2,
    backgroundColor: "#38BDF8",
  },

  logo: {
    width: 125,
    height: 88,
    marginTop: 0,
    marginLeft: -5,
  },

  playerInfo: {
    marginTop: 0,
    marginLeft: 10,
  },

  welcomeText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 6,
  },

  playerName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    maxWidth: 150,
  },

  uidBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
    width: 110,
    backgroundColor: "#17243A",
    borderWidth: 2,
    borderColor: "#2B4162",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },

  uidLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "800",
  },

  uidText: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "700",
  },

  // CENTER CHARACTER
  characterContainer: {
    position: "absolute",
    left: "35%",
    bottom: 0,
    width: "43%",
    height: 240,
    alignItems: "center",
    justifyContent: "flex-end",
    zIndex: 1,
  },

  characterGlow: {
    position: "absolute",
    width: 115,
    height: 125,
    borderRadius: 60,
    backgroundColor: "#1D8FE1",
    opacity: 0.18,
    bottom: 18,
  },

  character: {
    width: "100%",
    height: 200,
  },

  // RIGHT SECTION
  rightSection: {
    flex: 1,
    alignItems: "flex-end",
    paddingRight: 13,
    paddingTop: 17,
    zIndex: 2,
  },

  coinCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#17243A",
    borderWidth: 1,
    borderColor: "#344967",
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 7,
  },

  coinIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "#29364A",
    alignItems: "center",
    justifyContent: "center",
  },

  coinEmoji: {
    fontSize: 16,
  },

  coinInfo: {
    alignItems: "flex-start",
  },

  coinLabel: {
    color: "#94A3B8",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  coinAmount: {
    color: "#FACC15",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2,
  },

  bottomBorder: {
    position: "absolute",
    bottom: 0,
    left: "15%",
    width: "70%",
    height: 1,
    backgroundColor: "#38BDF8",
    opacity: 0.25,
  },
});
