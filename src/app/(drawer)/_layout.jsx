import { Drawer } from "expo-router/drawer";
import CustomDrawer from "../components/CustomDrawer";

export default function Layout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        swipeEnabled: true,
        overlayColor: "rgba(0,0,0,0.7)",
        sceneStyle: {
          backgroundColor: "#080D1B",
        },
      }}
    >
      <Drawer.Screen
        name="Home"
        options={{
          drawerLabel: "Home",
          title: "Home",
        }}
      />

      <Drawer.Screen
        name="Playwithfriends"
        options={{
          drawerLabel: "Play with Friends",
          title: "Play with Friends",
        }}
      />

      <Drawer.Screen
        name="Onlineplay"
        options={{
          drawerLabel: "Online Play",
          title: "Online Play",
        }}
      />
    </Drawer>
  );
}
