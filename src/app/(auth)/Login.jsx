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
} from "react-native";
import { useRouter } from "expo-router";


export default function Login() {
  const router = useRouter();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar hidden />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom: 60,
          alignItems: "center",
        }}
      >

        {/* FORM */}
        <View
          style={{
            width: "90%",
            marginTop: 30,
          }}
        >
          <Text
            style={{
              fontSize: 24,
              fontWeight: "700",
              color: "#333",
              textAlign: "center",
            }}
          >
            Login
          </Text>

          <Text
            style={{
              color: "#555",
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            Enter your email and password to login
          </Text>

          {/* Email */}
          <Text style={{ fontWeight: "600", marginBottom: 5 }}>Email</Text>
          <TextInput
            placeholder="Enter your email"
            placeholderTextColor="#aaa"
            style={{
              borderWidth: 1,
              borderColor: "#008CFF",
              borderRadius: 8,
              padding: 12,
              marginBottom: 20,
            }}
          />

          {/* Password */}
          <Text style={{ fontWeight: "600", marginBottom: 5 }}>Password</Text>
          <TextInput
            placeholder="Enter your password"
            placeholderTextColor="#aaa"
            secureTextEntry
            style={{
              borderWidth: 1,
              borderColor: "#008CFF",
              borderRadius: 8,
              padding: 12,
              marginBottom: 15,
            }}
          />

          <Text
            style={{
              textAlign: "right",
              color: "#008CFF",
              marginBottom: 25,
              fontWeight: "500",
            }}
          >
            Forgot password?
          </Text>

          <TouchableOpacity
            style={{
              backgroundColor: "#008CFF",
              paddingVertical: 15,
              borderRadius: 10,
              alignItems: "center",
              marginBottom: 20,
            }}
            onPress={() => router.push("/(auth)/Signup")}
          >
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 16 }}>
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
