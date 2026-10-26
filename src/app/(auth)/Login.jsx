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
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Toast from "react-native-toast-message";
import Loader from "../components/Loader";
import { auth, firestore } from "../utils/Firebase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
      // Step 1: Login with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const firebaseUser = userCredential.user;

      // Step 2: Get player profile from Firestore
      const userRef = doc(firestore, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        Toast.show({
          type: "error",
          text1: "Profile Not Found",
          text2: "Your account exists, but your player profile is missing.",
        });
        return;
      }

      const profile = userSnap.data();

      // Step 3: Save only the data needed by the app
      const userData = {
        uid: firebaseUser.uid,
        name: profile.name,
        email: firebaseUser.email,
        playerId: profile.playerId,
        coins: profile.coins,
      };

      await AsyncStorage.setItem("user", JSON.stringify(userData));

      // Step 4: Show success and navigate to Home
      Toast.show({
        type: "success",
        text1: "Login Successful!",
        text2: `Welcome back, ${profile.name}!`,
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

  return (
    <View style={{flex: 1}}>
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
            Welcome <Text style={styles.headingBlue}>Back!</Text>
          </Text>

          <Text style={styles.subtitle}>Log in and get back in the game.</Text>
        </View>

        {/* Login form */}
        <View style={styles.form}>
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

          <Text style={[styles.label, { marginTop: 22 }]}>PASSWORD</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputIcon}>⌑</Text>

            <TextInput
              placeholder="Enter your password"
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

          {/* Forgot password */}
          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => router.push("/(auth)/ForgotPassword")}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.loginButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.loginButtonText}>
              LOGIN
            </Text>

            {!loading && <Text style={styles.arrow}>→</Text>}
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
          <Text style={styles.footerText}>THINK FAST. BID SMART. WIN BIG.</Text>
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
    backgroundColor: "#0B1020",
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
    marginBottom: 8,
  },

  logo: {
    width: 175,
    height: 115,
  },

  headingContainer: {
    alignItems: "center",
    marginBottom: 35,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  headingBlue: {
    color: "#38BDF8",
  },

  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 10,
  },

  form: {
    width: "100%",
  },

  label: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 10,
  },

  inputContainer: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#131D31",
    borderWidth: 1,
    borderColor: "#293A56",
    borderRadius: 14,
    paddingHorizontal: 15,
  },

  inputIcon: {
    color: "#38BDF8",
    fontSize: 20,
    width: 30,
  },

  input: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    paddingVertical: 15,
  },

  showButton: {
    paddingVertical: 10,
    paddingLeft: 8,
  },

  showText: {
    color: "#38BDF8",
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
    color: "#38BDF8",
    fontSize: 13,
    fontWeight: "600",
  },

  loginButton: {
    height: 60,
    borderRadius: 16,
    backgroundColor: "#1D8FE1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#1D8FE1",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 2,
  },

  arrow: {
    position: "absolute",
    right: 18,
    color: "#FFFFFF",
    fontSize: 25,
  },

  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 27,
    flexWrap: "wrap",
  },

  signupText: {
    color: "#94A3B8",
    fontSize: 13,
  },

  signupLink: {
    color: "#38BDF8",
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
    backgroundColor: "#273247",
  },

  footerText: {
    color: "#64748B",
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
;
