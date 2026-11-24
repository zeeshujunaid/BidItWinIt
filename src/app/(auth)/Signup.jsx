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
  Modal,
  StyleSheet,
  Animated,
} from "react-native";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Loader from "../components/Loader";
import * as ImagePicker from "expo-image-picker";
import { createUserWithEmailAndPassword, deleteUser } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "../utils/Firebase";
import { File } from "expo-file-system";

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

export default function Signup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const CLOUDINARY_CLOUD_NAME = "dudx3of1n";
  const CLOUDINARY_UPLOAD_PRESET = "Biditwinit";

  const [profilePic, setProfilePic] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // UI-only state
  const [focused, setFocused] = useState(null);
  const pulse = useRef(new Animated.Value(0.1)).current;

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

  const avatars = [
    {
      id: "avatar1",
      uri: "https://api.dicebear.com/9.x/adventurer/png?seed=Felix&size=256",
    },
    {
      id: "avatar2",
      uri: "https://api.dicebear.com/9.x/adventurer/png?seed=Luna&size=256",
    },
    {
      id: "avatar3",
      uri: "https://api.dicebear.com/9.x/adventurer/png?seed=Max&size=256",
    },
    {
      id: "avatar4",
      uri: "https://api.dicebear.com/9.x/adventurer/png?seed=Oliver&size=256",
    },
  ];

  const PickCustomImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Toast.show({
          type: "error",
          text1: "Gallery permission required",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePic(result.assets[0].uri);
        setShowAvatarModal(false);
      }
    } catch (error) {
      console.log("Image picker error:", error);
    }
  };

  const SelectAvatar = (uri) => {
    setProfilePic(uri);
    setShowAvatarModal(false);
  };

  const UploadToCloudinary = async (imageUri) => {
    const formData = new FormData();

    if (imageUri.startsWith("http")) {
      // Predefined avatar URL
      formData.append("file", imageUri);
    } else {
      // Custom gallery image
      const file = new File(imageUri);
      formData.append("file", file);
    }

    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", "biditwinit");

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: "POST",
        body: formData,
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Image upload failed");
    }

    return data.secure_url;
  };

  const HandleSignup = async () => {
    // 1. Name validation
    if (!name.trim()) {
      Toast.show({
        type: "error",
        text1: "Name is required",
      });
      return;
    }

    // 2. Email validation
    if (!email.trim()) {
      Toast.show({
        type: "error",
        text1: "Email is required",
      });
      return;
    }

    // Valid email format: example@gmail.com, example@yahoo.com
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email.trim())) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid email address",
        text2: "Example: example@gmail.com",
      });
      return;
    }

    // 3. Password validation
    if (!password.trim()) {
      Toast.show({
        type: "error",
        text1: "Password is required",
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: "error",
        text1: "Password must be at least 6 characters",
      });
      return;
    }

    // 4. Confirm password validation
    if (!confirmPassword.trim()) {
      Toast.show({
        type: "error",
        text1: "Please confirm your password",
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: "Confirm password does not match",
      });
      return;
    }

    setLoading(true);

    let createdUser = null;
    let profileCreated = false;

    try {
      // Create Firebase Authentication account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      createdUser = userCredential.user;

      // Upload selected image or default avatar
      const imageToUpload = profilePic || avatars[0].uri;

      const uploadedProfilePic = await UploadToCloudinary(imageToUpload);

      const startingCoins = 10000;

      const playerId = Math.floor(100000 + Math.random() * 900000);

      // Save user profile in Firestore
      await setDoc(doc(firestore, "users", createdUser.uid), {
        uid: createdUser.uid,
        name: name.trim(),
        email: email.trim(),
        coins: startingCoins,
        createdAt: Date.now(),
        playerId: playerId,
        activeRoom: "",
        profilePic: uploadedProfilePic,
      });

      profileCreated = true;

      Toast.show({
        type: "success",
        text1: "Account Created!",
        text2: `${startingCoins} coins added to your account.`,
      });

      router.replace("/(drawer)/Home");
    } catch (error) {
      console.log("Signup error:", error);

      // Remove incomplete Firebase account if profile was not saved
      if (createdUser && !profileCreated) {
        try {
          await deleteUser(createdUser);
          console.log("Incomplete Firebase account deleted");
        } catch (deleteError) {
          console.log("Account cleanup error:", deleteError);
        }
      }

      let errorMessage = error.message;

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Please login.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password must be at least 6 characters.";
      }

      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const onSignupPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // haptics not available, ignore
    }
    HandleSignup();
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {loading && <Loader />}

        <StatusBar hidden />

        {/* Background glow */}
        <Animated.View style={[styles.glowTop, { opacity: pulse }]} />
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

          {/* Profile Picture */}
          <View style={styles.profileContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowAvatarModal(true)}
              style={styles.profileImageWrapper}
            >
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  style={styles.profileImage}
                />
              ) : (
                <Ionicons name="person" size={46} color={COLORS.gold} />
              )}

              <View style={styles.cameraIcon}>
                <Ionicons name="camera" size={15} color="#1A1200" />
              </View>
            </TouchableOpacity>

            <Text style={styles.profileTitle}>PROFILE PICTURE</Text>

            <Text style={styles.profileSubtitle}>
              Choose your bidder avatar
            </Text>
          </View>

          {/* Heading */}
          <View style={styles.headingContainer}>
            <Text style={styles.heading}>
              Join the <Text style={styles.headingGold}>Auction</Text>
            </Text>

            <Text style={styles.subtitle}>
              Start with 10,000 coins. Make every bid count.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <Text style={styles.label}>FULL NAME</Text>

            <View
              style={[
                styles.inputContainer,
                focused === "name" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={focused === "name" ? COLORS.gold : COLORS.muted}
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.placeholder}
                style={styles.input}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                onFocus={() => setFocused("name")}
                onBlur={() => setFocused(null)}
                selectionColor={COLORS.gold}
              />
            </View>

            {/* Email */}
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

            {/* Password */}
            <Text style={styles.label}>PASSWORD</Text>

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
                placeholder="Create a password"
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

            {/* Confirm Password */}
            <Text style={styles.label}>CONFIRM PASSWORD</Text>

            <View
              style={[
                styles.inputContainer,
                focused === "confirm" && styles.inputFocused,
              ]}
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={focused === "confirm" ? COLORS.gold : COLORS.muted}
                style={styles.inputIcon}
              />

              <TextInput
                placeholder="Re-enter your password"
                placeholderTextColor={COLORS.placeholder}
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                onFocus={() => setFocused("confirm")}
                onBlur={() => setFocused(null)}
                selectionColor={COLORS.gold}
              />

              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.showButton}
              >
                <Text style={styles.showText}>
                  {showConfirmPassword ? "HIDE" : "SHOW"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Signup button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.signupButtonWrap, loading && { opacity: 0.7 }]}
              onPress={onSignupPress}
            >
              <LinearGradient
                colors={[COLORS.goldLight, COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.signupButton}
              >
                <Text style={styles.signupButtonText}>CLAIM YOUR SEAT</Text>

                <Ionicons
                  name="hammer"
                  size={22}
                  color="#1A1200"
                  style={styles.arrow}
                />
              </LinearGradient>
            </TouchableOpacity>

            {/* Login link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>

              <TouchableOpacity onPress={() => router.push("/(auth)/Login")}>
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

          {/* Avatar Selection Modal */}
          <Modal
            visible={showAvatarModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowAvatarModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>Choose Avatar</Text>

                    <Text style={styles.modalSubtitle}>
                      Pick the face your rivals will fear
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowAvatarModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Four Avatars */}
                <View style={styles.avatarGrid}>
                  {avatars.map((avatar) => {
                    const isSelected = profilePic === avatar.uri;

                    return (
                      <TouchableOpacity
                        key={avatar.id}
                        activeOpacity={0.8}
                        onPress={() => SelectAvatar(avatar.uri)}
                        style={[
                          styles.avatarOption,
                          isSelected && styles.selectedAvatar,
                        ]}
                      >
                        <Image
                          source={{ uri: avatar.uri }}
                          style={styles.avatarOptionImage}
                        />

                        {isSelected && (
                          <View style={styles.selectedCheck}>
                            <Ionicons
                              name="checkmark"
                              size={15}
                              color="#1A1200"
                            />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Custom Image Button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.customImageButton}
                  onPress={PickCustomImage}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={28}
                    color={COLORS.gold}
                    style={{ marginRight: 13 }}
                  />

                  <View style={{ flex: 1 }}>
                    <Text style={styles.customImageTitle}>
                      Add Custom Image
                    </Text>

                    <Text style={styles.customImageSubtitle}>
                      Choose a photo from your gallery
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={COLORS.gold}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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
    paddingTop: 20,
    paddingBottom: 25,
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

  profileContainer: {
    alignItems: "center",
    marginBottom: 24,
  },

  profileImageWrapper: {
    width: 105,
    height: 105,
    borderRadius: 55,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 55,
  },

  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    borderWidth: 2,
    borderColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  profileTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  profileSubtitle: {
    color: COLORS.placeholder,
    fontSize: 11,
    marginTop: 5,
  },

  // Modal

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },

  modalContainer: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.35)",
    padding: 22,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  modalTitle: {
    color: COLORS.text,
    fontSize: 21,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 6,
  },

  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#25344D",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 16,
    marginBottom: 25,
  },

  avatarOption: {
    width: "43%",
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: COLORS.bg,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  selectedAvatar: {
    borderColor: COLORS.gold,
  },

  avatarOptionImage: {
    width: "100%",
    height: "100%",
  },

  selectedCheck: {
    position: "absolute",
    top: 7,
    right: 7,
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  customImageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    padding: 15,
  },

  customImageTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },

  customImageSubtitle: {
    color: COLORS.placeholder,
    fontSize: 10,
    marginTop: 5,
  },

  heading: {
    color: COLORS.text,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: 0.3,
  },

  headingGold: {
    color: COLORS.gold,
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 9,
    textAlign: "center",
  },

  form: {
    width: "100%",
  },

  label: {
    color: COLORS.label,
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
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
  },

  inputFocused: {
    borderColor: COLORS.gold,
    backgroundColor: "#1A2538",
  },

  inputIcon: {
    width: 29,
  },

  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    paddingVertical: 14,
  },

  showButton: {
    paddingVertical: 10,
    paddingLeft: 8,
  },

  showText: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  signupButtonWrap: {
    marginTop: 30,
    borderRadius: 16,
    shadowColor: COLORS.goldDark,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },

  signupButton: {
    height: 58,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  signupButtonText: {
    color: "#1A1200",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },

  arrow: {
    position: "absolute",
    right: 18,
  },

  loginContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 25,
  },

  loginText: {
    color: COLORS.muted,
    fontSize: 12,
  },

  loginLink: {
    color: COLORS.gold,
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
    backgroundColor: COLORS.line,
  },

  footerText: {
    color: COLORS.gold,
    opacity: 0.8,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});
