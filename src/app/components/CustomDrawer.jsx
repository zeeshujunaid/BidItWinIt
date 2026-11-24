import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "../context/Authcontext";

const COLORS = {
  bg: "#0B1020",
  gold: "#FBBF24",
  goldDark: "#F59E0B",
  border: "#263752",
};

const MENU_ITEMS = [
  { label: "Home", icon: "home", path: "/Home" },
  { label: "Play with Friends", icon: "people", path: "/Playwithfriends" },
  { label: "Online Play", icon: "flash", path: "/Onlineplay" },
  { label: "Leaderboard", icon: "trophy", path: null },
  { label: "Settings", icon: "settings", path: null },
];

export default function CustomDrawer(props) {
  const { user, loading, logout } = useAuth();
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

  if (loading) {
    return <View style={{ height: 240, backgroundColor: COLORS.bg }} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />

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
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Image
                source={{ uri: user?.profilePic }}
                style={styles.avatarImage}
                resizeMode="cover"
              />
            </View>
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.welcome}>WELCOME BACK, BIDDER</Text>
            <Text style={styles.playerName} numberOfLines={1}>
              {user?.name || "Player"}
            </Text>
            <Text style={styles.uid}>#{user?.playerId ?? "------"}</Text>
          </View>
        </View>

        {/* Coins */}
        <View style={styles.coinsCard}>
          <View style={styles.coinBadge}>
            <Text style={styles.coinEmoji}>🪙</Text>
          </View>

          <View style={styles.coinInfo}>
            <Text style={styles.coinLabel}>YOUR BALANCE</Text>
            <Text style={styles.coinAmount}>
              {Number(user?.coins ?? 0).toLocaleString("en-US")} Coins
            </Text>
          </View>

          <Ionicons name="add-circle" size={26} color={COLORS.gold} />
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
                {active && <View style={styles.activeBar} />}

                <Ionicons
                  name={item.icon}
                  size={22}
                  color={active ? COLORS.gold : "#8EA3C0"}
                  style={styles.menuIcon}
                />
                <Text
                  style={[styles.menuLabel, active && styles.menuLabelActive]}
                >
                  {item.label}
                </Text>

                {!item.path && (
                  <View style={styles.soonBadge}>
                    <Text style={styles.soonText}>SOON</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={async () => {
            await logout();
            router.replace("/(auth)/Login");
          }}
          style={styles.logoutButton}
        >
          <View style={styles.logoutLeft}>
            <View style={styles.logoutIconBox}>
              <Ionicons name="log-out-outline" size={22} color="#F87171" />
            </View>

            <View>
              <Text style={styles.logoutTitle}>Logout</Text>
              <Text style={styles.logoutSubtitle}>
                Sign out of your account
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={20} color="#F87171" />
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Player Status */}
      <View style={styles.bottom}>
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />

          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>THE AUCTION IS LIVE</Text>
            <Text style={styles.statusSubtitle}>Your next win awaits.</Text>
          </View>

          <Ionicons name="hammer" size={22} color={COLORS.gold} />
        </View>

        <Text style={styles.version}>BID IT WIN IT • v1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    overflow: "hidden",
  },

  glowTop: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: COLORS.goldDark,
    opacity: 0.12,
    top: -130,
    right: -100,
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
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 16,
    padding: 13,
    marginBottom: 14,
    gap: 12,
  },

  avatarWrap: {
    width: 49,
    height: 49,
  },

  avatar: {
    width: 49,
    height: 49,
    borderRadius: 15,
    backgroundColor: "#1B1A14",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
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
    color: COLORS.gold,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },

  playerName: {
    color: "#FFFFFF",
    fontSize: 14,
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
    backgroundColor: "#1B1A14",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 14,
    padding: 13,
    gap: 11,
    marginBottom: 30,
  },

  coinBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(251, 191, 36, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },

  coinEmoji: {
    fontSize: 22,
  },

  coinInfo: {
    flex: 1,
  },

  coinLabel: {
    color: "#FDE68A",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1,
    opacity: 0.8,
  },

  coinAmount: {
    color: "#FDE047",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
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
    backgroundColor: "rgba(251, 191, 36, 0.10)",
    borderColor: "rgba(251, 191, 36, 0.55)",
  },

  activeBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 3,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },

  menuIcon: {
    width: 25,
    textAlign: "center",
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

  soonBadge: {
    borderWidth: 1,
    borderColor: "#334762",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },

  soonText: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  logoutButton: {
    marginTop: 10,
    marginHorizontal: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "rgba(217, 54, 79, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(217, 54, 79, 0.35)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  logoutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  logoutIconBox: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: "rgba(217, 54, 79, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutTitle: {
    color: "#FCA5A5",
    fontSize: 14,
    fontWeight: "900",
  },

  logoutSubtitle: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 3,
  },

  bottom: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(251, 191, 36, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.28)",
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
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  statusSubtitle: {
    color: "#8194AF",
    fontSize: 10,
    marginTop: 4,
  },

  version: {
    color: "#52627A",
    fontSize: 9,
    textAlign: "center",
    marginTop: 15,
    letterSpacing: 1,
  },
});
