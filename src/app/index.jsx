import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Background glow effects */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.content}>
        {/* Top badge */}
        <View style={styles.badge}>
          <View style={styles.onlineDot} />
          <Text style={styles.badgeText}>MULTIPLAYER GAMING</Text>
        </View>

        {/* Main heading */}
        <Text style={styles.heading}>
          READY.
          <Text style={styles.headingBlue}> SET.</Text>
        </Text>

        <Text style={styles.headingSecond}>BID IT WIN IT.</Text>

        {/* Game logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoGlow} />

          <Image
            source={require("../../assets/images/textlogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Description */}
        <Text style={styles.description}>
          Think fast. Bid smart.{"\n"}
          <Text style={styles.descriptionHighlight}>Win together.</Text>
        </Text>

        {/* Play button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/(auth)/Login")}
          style={styles.buttonWrapper}
        >
          <View style={styles.playButton}>
            <Text style={styles.playButtonText}>LET'S PLAY</Text>

            <View style={styles.arrowCircle}>
              <Text style={styles.arrow}>→</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Secondary action */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push("/(auth)/Login")}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryText}>
            Already have an account?{" "}
            <Text style={styles.loginText}>Log in</Text>
          </Text>
        </TouchableOpacity>

        {/* Bottom footer */}
        <View style={styles.footer}>
          <View style={styles.footerLine} />
          <Text style={styles.footerText}>
            PLAY WITH FRIENDS • CHALLENGE THE WORLD
          </Text>
          <View style={styles.footerLine} />
        </View>
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

  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 16,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#151F35",
    borderWidth: 1,
    borderColor: "#273957",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 30,
    marginBottom: 28,
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#38BDF8",
    marginRight: 9,
  },

  badgeText: {
    color: "#B9D9FF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 43,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },

  headingBlue: {
    color: "#38BDF8",
  },

  headingSecond: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 5,
    marginTop: 5,
  },

  logoContainer: {
    width: 250,
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 2,
  },

  logoGlow: {
    position: "absolute",
    width: 155,
    height: 155,
    borderRadius: 100,
    backgroundColor: "#2563EB",
    opacity: 0.12,
  },

  logo: {
    width: 235,
    height: 190,
  },

  description: {
    color: "#CBD5E1",
    fontSize: 18,
    lineHeight: 29,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
  },

  descriptionHighlight: {
    color: "#38BDF8",
    fontWeight: "800",
  },
  buttonWrapper: {
    width: "100%",
    marginTop: 34,
    borderRadius: 18,
    backgroundColor: "#1D8FE1",
    shadowColor: "#1D8FE1",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },

  playButton: {
    height: 62,
    borderRadius: 18,
    backgroundColor: "#1D8FE1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  playButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 2,
  },

  arrowCircle: {
    position: "absolute",
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#50AAEC",
    alignItems: "center",
    justifyContent: "center",
  },

  arrow: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
  },

  secondaryButton: {
    paddingVertical: 20,
    paddingHorizontal: 10,
  },

  secondaryText: {
    color: "#94A3B8",
    fontSize: 13,
  },

  loginText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  footer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    gap: 9,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#273247",
  },

  footerText: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
;
