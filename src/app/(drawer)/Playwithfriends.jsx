import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Header from "../components/Header";

export default function Playwithfriends() {
  const router = useRouter();

  const handleCreateRoom = () => {
    router.push("/CreateRoom");
  };

  const handleJoinRoom = () => {
    router.push("/JoinRoom");
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

        {/* Friends Illustration */}
        {/* <View style={styles.hero}>
          <View style={styles.heroGlow} />

          <View style={styles.avatarRow}>
            <View style={[styles.avatar, styles.avatarOne]}>
              <Ionicons name="person" size={28} color="#F5D28B" />
            </View>

            <View style={[styles.avatar, styles.avatarTwo]}>
              <Ionicons name="person" size={28} color="#F5D28B" />
            </View>

            <View style={[styles.avatar, styles.avatarThree]}>
              <Ionicons name="person" size={28} color="#F5D28B" />
            </View>

            <View style={[styles.avatar, styles.avatarFour]}>
              <Ionicons name="person" size={28} color="#F5D28B" />
            </View>
          </View>

          <View style={styles.gavelCircle}>
            <Ionicons name="hammer" size={65} color="#F5C76B" />
          </View>

          <View style={styles.coins}>
            <Ionicons name="logo-bitcoin" size={30} color="#F5C76B" />
            <Ionicons name="logo-bitcoin" size={22} color="#D99B35" />
            <Ionicons name="logo-bitcoin" size={27} color="#F5C76B" />
          </View>

          <Text style={styles.heroTitle}>The More, The Merrier!</Text>

          <Text style={styles.heroSubtitle}>
            Invite your friends. Make your moves. Win together.
          </Text>
        </View> */}

        {/* Create Room */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.createButton}
          onPress={handleCreateRoom}
        >
          <View style={styles.buttonIcon}>
            <Ionicons name="add-circle" size={27} color="#171321" />
          </View>

          <View style={styles.buttonContent}>
            <Text style={styles.createTitle}>Create Room</Text>
            <Text style={styles.createSubtitle}>
              Start a new private auction
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

  hero: {
    backgroundColor: "#151B2D",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#554324",
    minHeight: 245,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    marginBottom: 24,
    overflow: "hidden",
  },

  heroGlow: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "#B78329",
    opacity: 0.1,
  },

  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  avatar: {
    width: 47,
    height: 47,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F5C76B",
    marginHorizontal: 5,
  },

  avatarOne: {
    backgroundColor: "#263B55",
  },

  avatarTwo: {
    backgroundColor: "#513B35",
  },

  avatarThree: {
    backgroundColor: "#3D315A",
  },

  avatarFour: {
    backgroundColor: "#345044",
  },

  gavelCircle: {
    width: 105,
    height: 105,
    borderRadius: 53,
    backgroundColor: "#292238",
    borderWidth: 1.5,
    borderColor: "#B88737",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
  },

  coins: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },

  heroTitle: {
    color: "#F5C76B",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 12,
  },

  heroSubtitle: {
    color: "#9BA8BD",
    fontSize: 11,
    textAlign: "center",
    marginTop: 6,
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
});
