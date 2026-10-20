import { useEffect, useState } from "react";
import { View, Image, StyleSheet } from "react-native";

const images = [
  require("../../../assets/images/chracter/shortbluechracter.png"),
  require("../../../assets/images/chracter/shortgreenchracter.png"),
  require("../../../assets/images/chracter/shortpinkchracter.png"),
  require("../../../assets/images/chracter/shortredchracter.png"),
  require("../../../assets/images/chracter/shortyellowchracter.png"),
];

export default function PicChanger() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Image
  source={images[currentIndex]}
  style={styles.image}
  resizeMode="contain"
/>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: 200,
    height: 200,
  },
});
