import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StatusBar,
  ImageBackground,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

export default function Index() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require("../../assets/images/bgimage.png")}
      resizeMode="cover"
      style={{ flex: 1 }}
    >
      <StatusBar hidden />

      {/* Light overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "rgba(255, 255, 255, 0.09)" },
        ]}
      />

      <View
        style={{
          flex: 1,
          paddingHorizontal: 28,
          paddingTop: "65%",
          alignItems: "center",
        }}
      >
        {/* Top Illustration */}
        <Image
          source={require("../../assets/images/Bidicon.png")}
          style={{
            width: 200,
            height: 180,
            resizeMode: "contain",
            marginBottom: 10,
          }}
        />

        <Image
          source={require("../../assets/images/textlogo.png")}
          style={{
            width: 200,
            height: 180,
            resizeMode: "contain",
            marginBottom: 10,
          }}
        />


        {/* Button */}
        <TouchableOpacity
          onPress={() => router.push("/(auth)/Login")}
          style={{
            backgroundColor: "#1D8FE1",
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
    </ImageBackground>
  );
}
