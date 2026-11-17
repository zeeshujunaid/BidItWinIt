import { Stack } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import * as NavigationBar from "expo-navigation-bar";

import { AuthProvider } from "./context/Authcontext";

export default function RootLayout() {
  useEffect(() => {
    NavigationBar.setVisibilityAsync("hidden");
  }, []);

  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1, gestureEnabled: false }}>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar hidden />
        <Toast />
      </GestureHandlerRootView>
    </AuthProvider>
  );
}
