import { useEffect } from "react";
import { BackHandler } from "react-native";
import Toast from "react-native-toast-message";

// Android back button block, player Leave button se hi nikle
export function useBlockBack() {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Toast.show({
        type: "info",
        text1: "Use the leave button to exit the room.",
      });
      return true; // back ko rok do
    });

    return () => sub.remove();
  }, []);
}
