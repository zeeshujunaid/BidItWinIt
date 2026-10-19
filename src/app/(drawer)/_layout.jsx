import { Drawer } from "expo-router/drawer";

export default function Layout() {
  return (
    <Drawer headerMode="screen" screenOptions={{ headerShown: false }}>
      
      <Drawer.Screen
        name="Home" 
        options={{
          drawerLabel: "Home",
          title: "overview",
        }}
      />

      {/* <Drawer.Screen
        name="user/[id]" 
        options={{
          drawerLabel: "User",
          title: "overview",
        }}
      /> */}
      
    </Drawer>
  );
}
