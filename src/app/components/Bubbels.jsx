import { useRef, useEffect } from "react";
import { View, Animated, StyleSheet } from "react-native";

// Each bubble: layout + color + how far / how fast it drifts
const BUBBLES = [
  {
    top: 100,
    left: -100,
    size: 220,
    color: "#FBBF24",
    opacity: 0.1,
    drift: 14,
    duration: 5200,
  },
  {
    top: 350,
    right: -75,
    size: 170,
    color: "#F59E0B",
    opacity: 0.1,
    drift: 18,
    duration: 6400,
  },
  {
    top: 650,
    left: -130,
    size: 260,
    color: "#7C3AED",
    opacity: 0.14,
    drift: 16,
    duration: 7000,
  },
  {
    top: 600,
    right: -31,
    size: 150,
    color: "#FBBF24",
    opacity: 0.09,
    drift: 12,
    duration: 5800,
  },
  {
    top: 1150,
    right: -100,
    size: 200,
    color: "#7C3AED",
    opacity: 0.13,
    drift: 20,
    duration: 6800,
  },
];

function Bubble({ config }) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: config.duration,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: config.duration,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [float, config.duration]);

  const translateY = float.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -config.drift],
  });

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          width: config.size,
          height: config.size,
          top: config.top,
          left: config.left,
          right: config.right,
          backgroundColor: config.color,
          opacity: config.opacity,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

export default function Bubbels() {
  return (
    <View pointerEvents="none" style={styles.bubbleContainer}>
      {BUBBLES.map((b, i) => (
        <Bubble key={i} config={b} />
      ))}
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
  },
});
