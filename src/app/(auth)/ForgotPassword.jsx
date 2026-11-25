import { useState } from "react";
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
} from "react-native";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
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

export default function ForgotPassword() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Toast.show({
        type: "error",
        text1: "Missing Email",
        text2: "Please enter your registered email address.",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Toast.show({
        type: "error",
        text1: "Invalid Email",
        text2: "Please enter a valid email address.",
      });
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {},
      );

      Toast.show({
        type: "success",
        text1: "Reset Email Sent!",
        text2: "Check your inbox for the password reset link.",
      });

      setEmail("");
    } catch (error) {
      console.log("Password reset error:", error.code, error.message);

      let message = "Something went wrong. Please try again.";

      if (error.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      } else if (error.code === "auth/user-not-found") {
        message = "No account found with this email.";
      } else if (error.code === "auth/too-many-requests") {
        message = "Too many attempts. Please try again later.";
      } else if (error.code === "auth/network-request-failed") {
        message = "Network error. Check your internet connection.";
      }

      Toast.show({
        type: "error",
        text1: "Reset Failed",
        text2: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const onResetPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});

    handleResetPassword();
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {loading && <Loader />}

        <StatusBar hidden />

        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={COLORS.gold} />
            <Text style={styles.backText}>BACK TO LOGIN</Text>
          </TouchableOpacity>

          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/images/textlogo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Recovery Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={["rgba(251,191,36,0.20)", "rgba(245,158,11,0.05)"]}
              style={styles.iconGradient}
            >
              <Ionicons
                name="lock-open-outline"
                size={35}
                color={COLORS.gold}
              />
            </LinearGradient>
          </View>

          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.heading}>
              Forgot <Text style={styles.headingGold}>Password?</Text>
            </Text>

            <Text style={styles.subtitle}>No worries, bidder. It happens!</Text>

            <Text style={styles.description}>
              Enter the email address linked to your account. We'll send you a
              secure link to reset your password.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>

            <View
              style={[styles.inputContainer, focused && styles.inputFocused]}
            >
              <Ionicons
                name="mail-outline"
                size={20}
                color={focused ? COLORS.gold : COLORS.muted}
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="Enter your registered email"
                placeholderTextColor={COLORS.placeholder}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                selectionColor={COLORS.gold}
              />
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.buttonWrap, loading && { opacity: 0.7 }]}
              onPress={onResetPress}
              disabled={loading}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resetButton}
              >
                <Text style={styles.buttonText}>SEND RESET LINK</Text>

                <Ionicons
                  name="paper-plane"
                  size={20}
                  color="#1A1200"
                  style={styles.buttonIcon}
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* Back to Login */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Remember your password? </Text>

              <TouchableOpacity onPress={() => router.replace("/(auth)/Login")}>
                <Text style={styles.loginLink}>Login</Text>
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
    opacity: 0.12,
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

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 10,
    gap: 9,
    paddingVertical: 8,
  },

  backText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 5,
  },

  logo: {
    width: 175,
    height: 105,
  },

  iconContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 20,
  },

  iconGradient: {
    width: 76,
    height: 76,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  headingContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  heading: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },

  headingGold: {
    color: COLORS.gold,
  },

  subtitle: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 12,
  },

  description: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 8,
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

  buttonWrap: {
    marginTop: 27,
    borderRadius: 16,
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },

  resetButton: {
    height: 60,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    color: "#1A1200",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.7,
  },

  buttonIcon: {
    position: "absolute",
    right: 18,
  },

  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 27,
    flexWrap: "wrap",
  },

  loginText: {
    color: COLORS.muted,
    fontSize: 13,
  },

  loginLink: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "800",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 45,
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