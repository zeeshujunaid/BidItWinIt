import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter, usePathname } from "expo-router";

const MENU_ITEMS = [
  { label: "Home", icon: "⌂", path: "/Home" },
  { label: "Play with Friends", icon: "♟", path: "/Playwithfriends" },
  { label: "Online Play", icon: "⚡", path: null },
  { label: "Leaderboard", icon: "🏆", path: null },
  { label: "Settings", icon: "⚙", path: null },
];

export default function CustomDrawer(props) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (path) => {
    props.navigation.closeDrawer();
    router.navigate(path);
  };

  const isActive = (path) => {
    if (!path) return false;
    return pathname.toLowerCase() === path.toLowerCase();
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Logo */}
        <View style={styles.brand}>
          <Image
            source={require("../../../assets/images/textlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Player Profile */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>Z</Text>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.welcome}>WELCOME BACK</Text>
            <Text style={styles.playerName}>Zeeshan Junaid</Text>
            <Text style={styles.uid}>UID #829104</Text>
          </View>
        </View>

        {/* Coins */}
        <View style={styles.coinsCard}>
          <Text style={styles.coinEmoji}>🪙</Text>

          <View style={styles.coinInfo}>
            <Text style={styles.coinLabel}>YOUR BALANCE</Text>
            <Text style={styles.coinAmount}>2,450 Coins</Text>
          </View>

          <Text style={styles.plus}>+</Text>
        </View>

        {/* Menu */}
        <Text style={styles.sectionLabel}>MAIN MENU</Text>

        <View style={styles.menu}>
          {MENU_ITEMS.map((item) => {
            const active = isActive(item.path);

            return (
              <TouchableOpacity
                key={item.label}
                activeOpacity={0.75}
                onPress={() => {
                  if (item.path) {
                    go(item.path);
                  } else {
                    console.log(`${item.label} selected`);
                  }
                }}
                style={[styles.menuItem, active && styles.menuItemActive]}
              >
                <Text
                  style={[styles.menuIcon, active && styles.menuIconActive]}
                >
                  {item.icon}
                </Text>
                <Text
                  style={[styles.menuLabel, active && styles.menuLabelActive]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Player Status */}
      <View style={styles.bottom}>
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />

          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>READY TO PLAY</Text>
            <Text style={styles.statusSubtitle}>Your next win awaits.</Text>
          </View>

          <Text style={styles.statusIcon}>⚡</Text>
        </View>

        <Text style={styles.version}>BID IT WIN IT • v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    borderRightWidth: 1,
    borderRightColor: "#263752",
  },

  scrollContent: {
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
    paddingHorizontal: 3,
  },

  logo: {
    width: 125,
    height: 88,
    marginLeft: -5,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#121E32",
    borderWidth: 1,
    borderColor: "#293D5A",
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
    gap: 12,
  },

  avatar: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: "#153B59",
    borderWidth: 1.5,
    borderColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },

  onlineDot: {
    position: "absolute",
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2,
    borderColor: "#121E32",
    right: -2,
    bottom: -2,
  },

  profileInfo: {
    flex: 1,
  },

  welcome: {
    color: "#38BDF8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },

  playerName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },

  uid: {
    color: "#8498B5",
    fontSize: 10,
    marginTop: 4,
  },

  coinsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#171D2D",
    borderWidth: 1,
    borderColor: "#5B4820",
    borderRadius: 14,
    padding: 13,
    gap: 11,
    marginBottom: 30,
  },

  coinEmoji: {
    fontSize: 25,
  },

  coinInfo: {
    flex: 1,
  },

  coinLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
  },

  coinAmount: {
    color: "#FACC15",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },

  plus: {
    color: "#FACC15",
    fontSize: 24,
    fontWeight: "700",
  },

  sectionLabel: {
    color: "#64748B",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 12,
    marginLeft: 8,
  },

  menu: {
    gap: 7,
  },

  menuItem: {
    minHeight: 53,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 13,
    overflow: "hidden",
  },

  menuItemActive: {
    backgroundColor: "#123451",
    borderColor: "#087FBF",
  },

  menuIcon: {
    width: 25,
    textAlign: "center",
    color: "#8EA3C0",
    fontSize: 22,
  },

  menuIconActive: {
    color: "#38BDF8",
  },

  menuLabel: {
    flex: 1,
    color: "#A9BAD0",
    fontSize: 13,
    fontWeight: "700",
  },

  menuLabelActive: {
    color: "#FFFFFF",
  },

  bottom: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#111B2D",
    borderWidth: 1,
    borderColor: "#293A53",
    borderRadius: 14,
    padding: 12,
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22C55E",
  },

  statusInfo: {
    flex: 1,
  },

  statusTitle: {
    color: "#E2E8F0",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  statusSubtitle: {
    color: "#8194AF",
    fontSize: 10,
    marginTop: 4,
  },

  statusIcon: {
    fontSize: 22,
  },

  version: {
    color: "#52627A",
    fontSize: 9,
    textAlign: "center",
    marginTop: 15,
    letterSpacing: 1,
  },
});
