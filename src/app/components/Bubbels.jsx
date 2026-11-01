import { View, StyleSheet } from "react-native";

export default function Bubbels() {
  return (
    <View pointerEvents="none" style={styles.bubbleContainer}>
          <View style={[styles.bubble, styles.bubbleOne]} />
          <View style={[styles.bubble, styles.bubbleTwo]} />
          <View style={[styles.bubble, styles.bubbleThree]} />
          <View style={[styles.bubble, styles.bubbleFour]} />
          <View style={[styles.bubble, styles.bubbleFive]} />
        </View>
    
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },

  bubble: {
    position: "absolute",
    borderRadius: 200,
    backgroundColor: "#00D9FF",
    opacity: 0.13,
  },

  bubbleOne: {
    width: 220,
    height: 220,
    top: 100,
    left: -100,
  },

  bubbleTwo: {
    width: 170,
    height: 170,
    top: 350,
    right: -75,
    backgroundColor: "#00A8CC",
    opacity: 0.12,
  },

  bubbleThree: {
    width: 260,
    height: 260,
    top: 650,
    left: -130,
    backgroundColor: "#245B8A",
    opacity: 0.16,
  },

  bubbleFour: {
    width: 150,
    height: 150,
    top: 600,
    right: -31,
    backgroundColor: "#00D9FF",
    opacity: 0.12,
  },

  bubbleFive: {
    width: 200,
    height: 200,
    top: 1150,
    right: -100,
    backgroundColor: "#245B8A",
    opacity: 0.15,
  },
});