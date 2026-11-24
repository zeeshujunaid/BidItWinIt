import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import PicChanger from "./PicChanger";
import { useAuth } from "../context/Authcontext";
import { useNavigation } from "expo-router";

const COLORS = {
  bg: "#0B1020",
  gold: "#FBBF24",
  goldDark: "#F59E0B",
  border: "#263752",
};

export default function Header() {
  const { user, loading, logout } = useAuth();

  const navigation = useNavigation();

  const handleMenuPress = () => {
    navigation.openDrawer();
  };

  if (loading) {
    return <View style={{ height: 240, backgroundColor: COLORS.bg }} />;
  }

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
          <Text style={styles.welcomeText}>WELCOME BACK, BIDDER</Text>

          <Text style={styles.playerName} numberOfLines={1}>
            {user?.name || "Player"}
          </Text>

          <View style={styles.uidBadge}>
            <Ionicons name="finger-print" size={12} color={COLORS.gold} />
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
    backgroundColor: COLORS.bg,
    flexDirection: "row",
    position: "relative",
    overflow: "hidden",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  glow: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.goldDark,
    opacity: 0.16,
    top: -130,
    left: 20,
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
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 2,
  },

  menuLine: {
    width: 17,
    height: 2,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
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
    color: COLORS.gold,
    fontSize: 9,
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
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.35)",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
  },

  uidText: {
    color: "#FDE68A",
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
    backgroundColor: COLORS.goldDark,
    opacity: 0.2,
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
    backgroundColor: "#1B1A14",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 8,
    gap: 7,
  },

  coinIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor: "rgba(251, 191, 36, 0.16)",
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
    color: "#FDE68A",
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.5,
    opacity: 0.8,
  },

  coinAmount: {
    color: "#FDE047",
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
    backgroundColor: COLORS.gold,
    opacity: 0.4,
  },
});
