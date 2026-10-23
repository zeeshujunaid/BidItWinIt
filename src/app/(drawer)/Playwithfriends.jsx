import React from "react";
import { View, Text, StyleSheet } from "react-native";


export default function Playwithfriends() {
    return (
        <View style={styles.container}>
      <Text style={styles.text}>Play with Friends Screen</Text>
    </View>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    padding: 16,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
});