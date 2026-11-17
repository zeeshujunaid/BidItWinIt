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
  Modal,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";
import Loader from "../components/Loader";
import * as ImagePicker from "expo-image-picker";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, firestore } from "../utils/Firebase";

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
  const [uploading, setUploading] = useState(false);

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

  const playerId = Math.floor(100000 + Math.random() * 900000);

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
      // Custom image from mobile gallery
      formData.append("file", {
        uri: imageUri,
        name: "profile.jpg",
        type: "image/jpeg",
      });
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
    if (
      password !== confirmPassword ||
      name.trim() === "" ||
      email.trim() === "" ||
      password.trim() === ""
    ) {
      Toast.show({
        type: "error",
        text1: "Please fill in all fields and ensure passwords match",
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

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = userCredential.user;

      // Upload selected image or default avatar
      const imageToUpload = profilePic || avatars[0].uri;

      const uploadedProfilePic = await UploadToCloudinary(imageToUpload);

      const startingCoins = 10000;

      const playerId = Math.floor(100000 + Math.random() * 900000);

      await setDoc(doc(firestore, "users", user.uid), {
        uid: user.uid,
        name: name.trim(),
        email: email.trim(),
        coins: startingCoins,
        createdAt: Date.now(),
        playerId: playerId,
        activeRoom: "",
        profilePic: uploadedProfilePic,
      });

      Toast.show({
        type: "success",
        text1: "Account Created!",
        text2: `${startingCoins} coins added to your account.`,
      });

      router.replace("/(drawer)/Home");
    } catch (error) {
      console.log("Signup error:", error);

      Toast.show({
        type: "error",
        text1: "Signup Failed",
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
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
                <Text style={styles.profilePlaceholder}>♙</Text>
              )}

              <View style={styles.cameraIcon}>
                <Text style={styles.cameraIconText}>+</Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.profileTitle}>PROFILE PICTURE</Text>

            <Text style={styles.profileSubtitle}>
              Choose your gaming avatar
            </Text>
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
              activeOpacity={0.8}
              style={styles.signupButton}
              onPress={HandleSignup}
            >
              <Text style={styles.signupButtonText}>CREATE ACCOUNT</Text>

              <Text style={styles.arrow}>→</Text>
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
                      Select your gaming profile picture
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setShowAvatarModal(false)}
                    style={styles.closeButton}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
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
                            <Text style={styles.selectedCheckText}>✓</Text>
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
                  <Text style={styles.customImageIcon}>＋</Text>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.customImageTitle}>
                      Add Custom Image
                    </Text>

                    <Text style={styles.customImageSubtitle}>
                      Choose a photo from your gallery
                    </Text>
                  </View>

                  <Text style={styles.customImageArrow}>→</Text>
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
    opacity: 0.1,
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
    backgroundColor: "#131D31",
    borderWidth: 2,
    borderColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 55,
  },

  profilePlaceholder: {
    color: "#38BDF8",
    fontSize: 48,
  },

  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1D8FE1",
    borderWidth: 2,
    borderColor: "#0B1020",
    alignItems: "center",
    justifyContent: "center",
  },

  cameraIconText: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "bold",
  },

  profileTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },

  profileSubtitle: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 5,
  },

  // Modal

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },

  modalContainer: {
    width: "100%",
    backgroundColor: "#131D31",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#293A56",
    padding: 22,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  modalTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: "#94A3B8",
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

  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
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
    backgroundColor: "#0B1020",
    borderWidth: 2,
    borderColor: "#293A56",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  selectedAvatar: {
    borderColor: "#38BDF8",
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
    backgroundColor: "#1D8FE1",
    alignItems: "center",
    justifyContent: "center",
  },

  selectedCheckText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },

  customImageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0B1020",
    borderWidth: 1,
    borderColor: "#293A56",
    borderRadius: 15,
    padding: 15,
  },

  customImageIcon: {
    color: "#38BDF8",
    fontSize: 27,
    marginRight: 13,
  },

  customImageTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  customImageSubtitle: {
    color: "#64748B",
    fontSize: 10,
    marginTop: 5,
  },

  customImageArrow: {
    color: "#38BDF8",
    fontSize: 22,
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
