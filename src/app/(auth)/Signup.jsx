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

export default function Signup() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar hidden />

      {/* Background glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
            Create <Text style={styles.headingBlue}>Account</Text>
          </Text>

          <Text style={styles.subtitle}>
            Join the game. Make every bid count.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Name */}
          <Text style={styles.label}>FULL NAME</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>♙</Text>

            <TextInput
              placeholder="Enter your full name"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

          {/* Email */}
          <Text style={styles.label}>EMAIL ADDRESS</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>✉</Text>

            <TextInput
              placeholder="Enter your email"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <Text style={styles.label}>PASSWORD</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>⌑</Text>

            <TextInput
              placeholder="Create a password"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
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

          {/* Confirm Password */}
          <Text style={styles.label}>CONFIRM PASSWORD</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>⌑</Text>

            <TextInput
              placeholder="Re-enter your password"
              placeholderTextColor="#64748B"
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              style={styles.showButton}
            >
              <Text style={styles.showText}>
                {showConfirmPassword ? "HIDE" : "SHOW"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Signup button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.signupButton}
            onPress={() => {
              // Connect signup validation and authentication here.
              router.push("/(drawer)/Home");
            }}
          >
            <Text style={styles.signupButtonText}>
              CREATE ACCOUNT
            </Text>

            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* Login link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Already have an account?{" "}
            </Text>

            <TouchableOpacity
              onPress={() => router.push("/(auth)/Login")}
            >
              <Text style={styles.loginLink}>Log in</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    overflow: "hidden",
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 20,
    paddingBottom: 25,
  },

  glowTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#164EAD",
    opacity: 0.16,
    top: -130,
    right: -110,
  },

  glowBottom: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#7C3AED",
    opacity: 0.10,
    bottom: -120,
    left: -120,
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 5,
  },

  logo: {
    width: 155,
    height: 95,
  },

  headingContainer: {
    alignItems: "center",
    marginBottom: 28,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  headingBlue: {
    color: "#38BDF8",
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 9,
    textAlign: "center",
  },

  form: {
    width: "100%",
  },

  label: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 9,
    marginTop: 17,
  },

  inputContainer: {
    minHeight: 55,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131D31",
    borderWidth: 1,
    borderColor: "#293A56",
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  inputIcon: {
    color: "#38BDF8",
    fontSize: 19,
    width: 29,
    textAlign: "left",
  },

  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    paddingVertical: 14,
  },

  showButton: {
    paddingVertical: 10,
    paddingLeft: 8,
  },

  showText: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  signupButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: "#1D8FE1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
    shadowColor: "#1D8FE1",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  arrow: {
    position: "absolute",
    right: 18,
    color: "#FFFFFF",
    fontSize: 24,
  },

  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 25,
  },

  loginText: {
    color: "#94A3B8",
    fontSize: 12,
  },

  loginLink: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "800",
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 32,
  },

  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#273247",
  },

  footerText: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});
;
