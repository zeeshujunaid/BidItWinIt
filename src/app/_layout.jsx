import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer screenOptions={{ headerShown: false }} />
      <Toast />
    </GestureHandlerRootView>
  );
}
