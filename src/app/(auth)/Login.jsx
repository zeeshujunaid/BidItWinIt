import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import Toast from "react-native-toast-message";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../components/Loader";
import { auth } from "../utils/Firebase";

const COLORS = {
  bg: "#0B1020",
  card: "#131D31",
  border: "#293A56",
  gold: "#FBBF24",
  goldLight: "#FDE047",
  goldDark: "#F59E0B",
  text: "#FFFFFF",
  label: "#CBD5E1",
  muted: "#94A3B8",
  placeholder: "#64748B",
  line: "#273247",
};

const ACTIVITY = [
  "🔥 Ali just won a Vintage Watch for 1,200 coins",
  "💰 Sara outbid Hamza and took a Mystery Crate",
  "🏆 Usman cashed out 3,500 coins in one round",
  "⚡ 12 players are bidding right now",
];

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // UI-only state
  const [focused, setFocused] = useState(null);
  const [activityIndex, setActivityIndex] = useState(0);
  const pulse = useRef(new Animated.Value(0.1)).current;
  const activityFade = useRef(new Animated.Value(1)).current;

  // Pulsing gold spotlight
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

  // Rotating live activity messages
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

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please enter your email and password.",
      });
      return;
    }

    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);

      Toast.show({
        type: "success",
        text1: "You're in!",
        text2: "Welcome back to BidItWinIt. Time to bid.",
      });

      router.replace("/(drawer)/Home");
    } catch (error) {
      console.log("Login error:", error.code, error.message);

      let message = "Something went wrong. Please try again.";

      if (
        error.code === "auth/invalid-credential" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/user-not-found"
      ) {
        message = "Invalid email or password.";
      } else if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Network error. Check your internet connection.";
      }

      Toast.show({
        type: "error",
        text1: "Login Failed",
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const onLoginPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // haptics not available, ignore
    }
    handleLogin();
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {loading && <Loader />}

        <StatusBar hidden />

        <Animated.View style={[styles.glowTop, { opacity: pulse }]} />
        <View style={styles.glowBottom} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/images/textlogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.heading}>
              Welcome <Text style={styles.headingGold}>Back, Bidder</Text>
            </Text>

            <Text style={styles.subtitle}>
              Your rivals are already bidding.
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

          {/* Login form */}
          <View style={styles.form}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>

            <View
              style={[
                styles.inputContainer,
                focused === "email" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={focused === "email" ? COLORS.gold : COLORS.muted}
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="Enter your email"
                placeholderTextColor={COLORS.placeholder}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
                selectionColor={COLORS.gold}
              />
            </View>

            <Text style={[styles.label, { marginTop: 22 }]}>PASSWORD</Text>

            <View
              style={[
                styles.inputContainer,
                focused === "password" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={focused === "password" ? COLORS.gold : COLORS.muted}
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="Enter your password"
                placeholderTextColor={COLORS.placeholder}
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setFocused("password")}
                onBlur={() => setFocused(null)}
                selectionColor={COLORS.gold}
              />

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showButton}
              >
                <Text style={styles.showText}>
                  {showPassword ? "HIDE" : "SHOW"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Forgot password */}
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => router.push("/(auth)/ForgotPassword")}
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Login button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.loginButtonWrap, loading && { opacity: 0.7 }]}
              onPress={onLoginPress}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.loginButton}
              >
                <Text style={styles.loginButtonText}>ENTER THE AUCTION</Text>

                {!loading && (
                  <Ionicons
                    name="hammer"
                    size={22}
                    color="#1A1200"
                    style={styles.arrow}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Signup link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>New to BidItWinIt? </Text>

              <TouchableOpacity onPress={() => router.push("/(auth)/Signup")}>
                <Text style={styles.signupLink}>Create account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>
              THINK FAST. BID SMART. WIN BIG.
            </Text>
            <View style={styles.footerLine} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: "hidden",
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 25,
    paddingBottom: 25,
    justifyContent: "center",
  },

  glowTop: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: COLORS.goldDark,
    top: -140,
    right: -110,
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

  logoContainer: {
    alignItems: "center",
    marginBottom: 8,
  },

  logo: {
    width: 175,
    height: 115,
  },

  headingContainer: {
    alignItems: "center",
    marginBottom: 22,
  },

  heading: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  headingGold: {
    color: COLORS.gold,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 10,
  },

  // Live activity strip
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251,191,36,0.08)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.25)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 28,
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

  form: {
    width: "100%",
  },

  label: {
    color: COLORS.label,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  inputContainer: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 15,
  },

  inputFocused: {
    borderColor: COLORS.gold,
    backgroundColor: "#1A2538",
  },

  inputIcon: {
    width: 30,
  },

  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    paddingVertical: 15,
  },

  showButton: {
    paddingVertical: 10,
    paddingLeft: 8,
  },

  showText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },

  forgotButton: {
    alignSelf: "flex-end",
    marginTop: 17,
    marginBottom: 27,
  },

  forgotText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "600",
  },

  loginButtonWrap: {
    borderRadius: 16,
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },

  loginButton: {
    height: 60,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  loginButtonText: {
    color: "#1A1200",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },

  arrow: {
    position: "absolute",
    right: 18,
  },

  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 27,
    flexWrap: "wrap",
  },

  signupText: {
    color: COLORS.muted,
    fontSize: 13,
  },

  signupLink: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "800",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 40,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.line,
  },

  footerText: {
    color: COLORS.gold,
    opacity: 0.8,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
