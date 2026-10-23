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

export default function Home() {
  const Router = useRouter();
  const handleFriends = () => {
    Router.replace("/Playwithfriends");
  };

  const handleOnline = () => {
    Router.replace("/Onlineplay");
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
          <Text style={styles.eyebrow}>READY TO PLAY?</Text>
          <Text style={styles.title}>Choose Your{"\n"}Game Mode</Text>
          <Text style={styles.subtitle}>
            Challenge friends. Beat the competition.
          </Text>
        </View>

        {/* PLAY WITH FRIENDS */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.friendsCard}
          onPress={handleFriends}
        >
          <View style={styles.cardTop}>
            <View style={styles.friendsIcon}>
              <Ionicons name="people" size={32} color="#38BDF8" />
            </View>

            <View style={styles.privateBadge}>
              <Text style={styles.privateText}>PRIVATE</Text>
            </View>
          </View>

          <Text style={styles.cardTitle}>Play with Friends</Text>

          <Text style={styles.cardDescription}>
            Create a room, invite your squad and compete together.
          </Text>

          <View style={styles.actionButton}>
            <Ionicons name="person-add" size={20} color="#38BDF8" />
            <Text style={styles.friendsAction}>Create or Join Room</Text>
            <View style={styles.arrow}>
              <Ionicons name="arrow-forward" size={22} color="#38BDF8" />
            </View>
          </View>
        </TouchableOpacity>

        {/* ONLINE PLAY */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.onlineCard}
          onPress={handleOnline}
        >
          <View style={styles.cardTop}>
            <View style={styles.onlineIcon}>
              <Ionicons name="trophy" size={32} color="#C084FC" />
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
            <Ionicons name="flash" size={22} color="#C084FC" />
            <Text style={styles.onlineAction}>Find a Match</Text>
            <View style={styles.arrow}>
              <Ionicons name="arrow-forward" size={22} color="#C084FC" />
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
    backgroundColor: "#080D1B",
  },

  content: {
    paddingHorizontal: 18,
    paddingTop: 27,
    paddingBottom: 35,
  },

  heading: {
    marginBottom: 24,
  },

  eyebrow: {
    color: "#38BDF8",
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

  subtitle: {
    color: "#8CAACB",
    fontSize: 12,
    marginTop: 9,
    lineHeight: 19,
  },

  friendsCard: {
    backgroundColor: "#101D32",
    borderWidth: 1.5,
    borderColor: "#079BE8",
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
    shadowColor: "#00A6FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
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
    backgroundColor: "#123451",
    borderWidth: 1,
    borderColor: "#087FBF",
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
    borderColor: "#00D8CF",
    backgroundColor: "#103A42",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  privateText: {
    color: "#2DE5DF",
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
    color: "#9BB6D4",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },

  actionButton: {
    minHeight: 52,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#075B91",
    backgroundColor: "#0A2039",
    paddingHorizontal: 12,
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
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
    flexShrink: 1,
  },

  onlineAction: {
    color: "#C084FC",
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
    backgroundColor: "#16466A",
  },

  footerText: {
    color: "#38BDF8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
