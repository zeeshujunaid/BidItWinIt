import React from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
} from "react-native";

const { width, height } = Dimensions.get("screen");

export default function Loader() {
  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Image
          source={require("../../../assets/images/textlogo.png")}
          style={styles.logo}
          resizeMode="contain"
        />

        <ActivityIndicator
          size="large"
          color="#ffcd08"
          style={styles.spinner}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: width,
    height: height,
    backgroundColor: "rgba(5, 12, 30, 0.88)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
    elevation: 99999,
  },

  content: {
    alignItems: "center",
    justifyContent: "center",
  },

  logo: {
    width: 240,
    height: 100,
  },

  spinner: {
    marginTop: 20,
  },
});
