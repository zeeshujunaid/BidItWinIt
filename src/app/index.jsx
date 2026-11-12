import {
  View,
  Text,
  ActivityIndicator,
  StatusBar,
  Image,
  StyleSheet,
} from "react-native";
import Bubbels from "./components/Bubbels";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { ref, get, update } from "firebase/database";
import { useAuth } from "../app/context/Authcontext";
import { db } from "../app/utils/Firebase";

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [checkingRoom, setCheckingRoom] = useState(true);

  useEffect(() => {
    if (loading) return;

    let isActive = true;

    const checkSession = async () => {
      try {
        // User login nahi hai
        if (!user) {
          router.replace("/(auth)/Login");
          return;
        }

        // Active room check
        const activeRoom = user.activeRoom;

        console.log("CURRENT USER:", user.uid);
        console.log("USER NAME:", user.name);
        console.log("ACTIVE ROOM:", user.activeRoom);

        if (!activeRoom) {
          router.replace("/(drawer)/Home");
          return;
        }

        // RTDB room check
        const roomRef = ref(db, `Rooms/${activeRoom}`);
        const snapshot = await get(roomRef);

        if (!snapshot.exists()) {
          router.replace("/(drawer)/Home");
          return;
        }

        const room = snapshot.val();


        console.log("ROOM EXISTS:", snapshot.exists());
        console.log("ROOM PLAYERS:", room.players);
        console.log("PLAYER FOUND:", room.players?.[user.uid]);
        console.log("AUCTION STATUS:", room.auctionStatus);

        // Player membership check
        const player = room.players?.[user.uid];

        if (!player) {
          router.replace("/(drawer)/Home");
          return;
        }

        // Finished game check
        if (room.auctionStatus === "finished") {
          router.replace("/(drawer)/Home");
          return;
        }

        // Reconnect player
        await update(ref(db, `Rooms/${activeRoom}/players/${user.uid}`), {
          isConnected: true,
        });

        if (!isActive) return;

        // Direct Game screen
        router.replace({
          pathname: "/Game",
          params: { roomId: activeRoom },
        });
      } catch (error) {
        console.log("Session checking error:", error);

        if (isActive) {
          router.replace("/(drawer)/Home");
        }
      }
    };

    checkSession();

    return () => {
      isActive = false;
    };
  }, [user, loading]);

 return (
  <View style={styles.container}>
    <StatusBar style="hidden" />

    <Bubbels />

    <View style={styles.content}>
      <Image
        source={require("../../assets/images/textlogo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.tagline}>
        THE ULTIMATE BIDDING EXPERIENCE
      </Text>

      <View style={styles.divider} />

       <Text style={styles.heading}>
        Your Bid. Your Strategy.{"\n"}
        <Text style={styles.highlight}>Your Win!</Text>
      </Text>

      <Text style={styles.description}>
        Challenge your friends, place your bids,
        and compete to win exciting items.
      </Text>

      <View style={styles.steps}>
        <View style={styles.step}>
          <Text style={styles.stepNumber}>01</Text>
          <Text style={styles.stepText}>Join a Room</Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNumber}>02</Text>
          <Text style={styles.stepText}>Place Your Bid</Text>
        </View>

        <View style={styles.step}>
          <Text style={styles.stepNumber}>03</Text>
          <Text style={styles.stepText}>Win Items</Text>
        </View>
      </View> 

      <ActivityIndicator
        size="large"
        color="#ffcd08"
        style={styles.spinner}
      />

      <Text style={styles.footer}>
        LET THE BIDDING BEGIN!
      </Text> 
    </View>
  </View>
);}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  logo: {
    width: 250,
    height: 110,
  },

  tagline: {
    color: "#ffcd08",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 5,
  },

  divider: {
    width: 45,
    height: 3,
    backgroundColor: "#ffcd08",
    borderRadius: 5,
    marginTop: 30,
    marginBottom: 25,
  },

  heading: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 38,
  },

  highlight: {
    color: "#ffcd08",
  },

  description: {
    color: "#9CA8BD",
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
    marginTop: 15,
    paddingHorizontal: 10,
  },

  steps: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 40,
    paddingVertical: 20,
    paddingHorizontal: 10,
    backgroundColor: "#151E32",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#26334A",
  },

  step: {
    alignItems: "center",
    flex: 1,
  },

  stepNumber: {
    color: "#ffcd08",
    fontSize: 21,
    fontWeight: "900",
  },

  stepText: {
    color: "#C5CDDA",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },

  spinner: {
    marginTop: 45,
  },

  footer: {
    color: "#66758F",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 15,
  },
});