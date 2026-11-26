import { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Header from "../components/Header";
import { useActiveRoomSync } from "../Hooks/useActiveRoomSync";
import { useAuth } from "../context/Authcontext";

const COLORS = {
  bg: "#0B1020",
  gold: "#FBBF24",
  goldLight: "#FDE047",
  goldDark: "#F59E0B",
  purple: "#C084FC",
  muted: "#9BB6D4",
};

const ACTIVITY = [
  "🔥 Ali just won a Vintage Watch for 1,200 coins",
  "💰 Sara outbid Hamza and took a Mystery Crate",
  "🏆 Usman cashed out 3,500 coins in one round",
  "⚡ 12 players are bidding right now",
];

const tap = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    // haptics not available, ignore
  }
};

export default function Home() {
  const { user } = useAuth();
  useActiveRoomSync(user);

  const Router = useRouter();
  const handleFriends = () => {
    Router.replace("/Playwithfriends");
  };

  const handleOnline = () => {
    Router.replace("/Onlineplay");
  };

  // UI-only state
  const [activityIndex, setActivityIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0.1)).current;
  const activityFade = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(activityFade, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setActivityIndex((i) => (i + 1) % ACTIVITY.length);
        Animated.timing(activityFade, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 3500);
    return () => clearInterval(interval);
  }, [activityFade]);

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
          <Text style={styles.eyebrow}>THE AUCTION IS LIVE</Text>
          <Text style={styles.title}>
            Choose Your{"\n"}
            <Text style={styles.titleGold}>Arena</Text>
          </Text>
          <Text style={styles.subtitle}>
            Outbid your rivals. Keep the profit.
          </Text>
        </View>

        {/* Live activity strip */}
        <View style={styles.activityCard}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
          <Animated.Text
            numberOfLines={1}
            style={[styles.activityText, { opacity: activityFade }]}
          >
            {ACTIVITY[activityIndex]}
          </Animated.Text>
        </View>

        {/* PLAY WITH FRIENDS */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.friendsCard}
          onPress={() => {
            tap();
            handleFriends();
          }}
        >
          <View style={styles.cardTop}>
            <View style={styles.friendsIcon}>
              <Ionicons name="people" size={32} color={COLORS.gold} />
            </View>

            <View style={styles.privateBadge}>
              <Text style={styles.privateText}>PRIVATE</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>Play with Friends</Text>

          <Text style={styles.cardDescription}>
            Create a room, invite your squad and bid against your friends.
          </Text>

          <LinearGradient
            colors={[COLORS.goldLight, COLORS.goldDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButton}
          >
            <Ionicons name="person-add" size={20} color="#1A1200" />
            <Text style={styles.friendsAction}>Create or Join Room</Text>
            <View style={styles.arrow}>
              <Ionicons name="hammer" size={22} color="#1A1200" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ONLINE PLAY */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.onlineCard}
          onPress={() => {
            tap();
            handleOnline();
          }}
        >
          <View style={styles.cardTop}>
            <View style={styles.onlineIcon}>
              <Ionicons name="trophy" size={32} color={COLORS.purple} />
            </View>

            <View style={styles.multiplayerBadge}>
              <Text style={styles.multiplayerText}>MULTIPLAYER</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>Online Play</Text>

          <Text style={styles.cardDescription}>
            Jump into public lobbies and challenge players online.
          </Text>

          <View style={styles.onlineActionButton}>
            <Ionicons name="flash" size={22} color={COLORS.purple} />
            <Text style={styles.onlineAction}>Find a Match</Text>
            <View style={styles.arrow}>
              <Ionicons name="arrow-forward" size={22} color={COLORS.purple} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>BID IT. WIN IT. REPEAT.</Text>
          <View style={styles.footerLine} />
        </View>
      </ScrollView>
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
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.goldDark,
    top: -140,
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

  content: {
    paddingHorizontal: 18,
    paddingTop: 27,
    paddingBottom: 35,
  },

  heading: {
    marginBottom: 20,
  },

  eyebrow: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 7,
  },

  title: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    lineHeight: 35,
  },

  titleGold: {
    color: COLORS.gold,
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 9,
    lineHeight: 19,
  },

  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 22,
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    marginRight: 6,
  },

  liveText: {
    color: "#EF4444",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginRight: 10,
  },

  activityText: {
    flex: 1,
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "600",
  },

  friendsCard: {
    backgroundColor: "#161A24",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },

  onlineCard: {
    backgroundColor: "#15132C",
    borderWidth: 1.5,
    borderColor: "#8145E8",
    borderRadius: 22,
    padding: 18,
    marginBottom: 25,
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },

  friendsIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(251,191,36,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  onlineIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#302052",
    borderWidth: 1,
    borderColor: "#7140C8",
    alignItems: "center",
    justifyContent: "center",
  },

  privateBadge: {
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.6)",
    backgroundColor: "rgba(251,191,36,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  privateText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  multiplayerBadge: {
    borderWidth: 1,
    borderColor: "#8746E8",
    backgroundColor: "#302052",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  multiplayerText: {
    color: "#D8B4FE",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },

  cardTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },

  cardDescription: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },

  actionButton: {
    minHeight: 52,
    borderRadius: 15,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  onlineActionButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#5731A5",
    backgroundColor: "#21183F",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },

  friendsAction: {
    color: "#1A1200",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
    flexShrink: 1,
  },

  onlineAction: {
    color: COLORS.purple,
    fontSize: 13,
    fontWeight: "800",
    flexShrink: 1,
  },

  arrow: {
    marginLeft: "auto",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  footerLine: {
    height: 1,
    flex: 1,
    backgroundColor: "#273247",
  },

  footerText: {
    color: COLORS.gold,
    opacity: 0.8,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
