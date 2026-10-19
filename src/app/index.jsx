import { View, Text, Image, TouchableOpacity, StatusBar } from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        paddingHorizontal: 28,
        paddingTop: "28%",
        alignItems: "center",
      }}
    >
      <StatusBar hidden />

      {/* Top Illustration */}
      <Image
        source={require("../../assets/images/Bidicon.png")}
        style={{
          width: 120,
          height: 180,
          resizeMode: "contain",
          marginBottom: 10,
        }}
      />

      {/* Heading */}
      <Text
        style={{
          fontSize: 38,
          fontWeight: "800",
          textAlign: "center",
          color: "#000", // dark healthcare blue
          marginBottom: 10,
          letterSpacing: 0.5,
        }}
      >
        BID IT <Text style={{ color: "#000" }}>WIN IT</Text>
      </Text>

      {/* Button */}
      <TouchableOpacity
        onPress={() => router.push("/(auth)/Login")}
        style={{
          backgroundColor: "#1D8FE1", // primary blue
          paddingVertical: 16,
          paddingHorizontal: 65,
          borderRadius: 40,
          elevation: 5,

          shadowColor: "#1D8FE1",
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        }}
        activeOpacity={0.8}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            fontWeight: "700",
            letterSpacing: 0.5,
          }}
        >
          Get Started
        </Text>
      </TouchableOpacity>

      {/* Small tagline */}
      <Text
        style={{
          marginTop: 22,
          color: "#000",
          fontSize: 13,
          letterSpacing: 0.3,
        }}
      >
        play with friends • play with online players
      </Text>
    </View>
  );
}