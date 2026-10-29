import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ref, onValue, get, update } from "firebase/database";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, firestore } from "../utils/Firebase";

const ROOM_NAMES = ["Room1", "Room2", "Room3", "Room4", "Room5"];

export default function OnlinePlay() {
  const router = useRouter();

  const [rooms, setRooms] = useState({});
  const [loading, setLoading] = useState(true);
  const [joiningRoom, setJoiningRoom] = useState("");

  useEffect(() => {
    const roomsRef = ref(db, "Rooms");

    const unsubscribe = onValue(
      roomsRef,
      (snapshot) => {
        setRooms(snapshot.val() || {});
        setLoading(false);
      },
      (error) => {
        console.log("Rooms error:", error);
        setLoading(false);
        Alert.alert("Error", "Rooms load nahi ho sake.");
      },
    );

    return unsubscribe;
  }, []);

  const handleJoinRoom = async (roomId) => {
    if (joiningRoom) return;

    setJoiningRoom(roomId);

    try {
      // 1. Logged-in user local storage se read karo
      const savedUser = await AsyncStorage.getItem("user");

      if (!savedUser) {
        Alert.alert("Login Required", "Pehle login karo.");
        return;
      }

      const localUser = JSON.parse(savedUser);
      const uid = localUser.uid;

      if (!uid) {
        Alert.alert("User Error", "User ID nahi mili. Dobara login karo.");
        return;
      }

      // 2. Latest profile Firestore se read karo
      const userRef = doc(firestore, "users", uid);
      const userSnapshot = await getDoc(userRef);

      if (!userSnapshot.exists()) {
        Alert.alert("Profile Missing", "Firestore profile nahi mili.");
        return;
      }

      const user = userSnapshot.data();

      // 3. Check karo player pehle kisi room mein hai ya nahi
      const activeRoom = user.activeRoom || "";

      if (activeRoom && activeRoom !== roomId) {
        Alert.alert(
          "Already in a Room",
          `Tum pehle ${activeRoom} mein ho. Pehle us room se leave karo.`,
        );
        return;
      }

      // 4. Latest room data Firebase se read karo
      const roomRef = ref(db, `Rooms/${roomId}`);
      const roomSnapshot = await get(roomRef);

      if (!roomSnapshot.exists()) {
        Alert.alert("Room Not Found", "Yeh room Firebase mein nahi mila.");
        return;
      }

      const room = roomSnapshot.val();
      const players = room.players || {};
      const alreadyJoined = Boolean(players[uid]);
      const playerCount = Object.keys(players).length;
      const maxPlayers = room.maxPlayers || 5;

      // 5. New players sirf waiting room join kar sakte hain
      if (!alreadyJoined && room.status !== "waiting") {
        Alert.alert("Room Unavailable", "Yeh room abhi join nahi ho sakta.");
        return;
      }

      if (!alreadyJoined && playerCount >= maxPlayers) {
        Alert.alert("Room Full", "Is room mein 5 players already hain.");
        return;
      }

      // 6. Available seat assign karo
      const usedSeats = Object.values(players)
        .map((player) => player.seatIndex)
        .filter((seat) => Number.isInteger(seat));

      let seatIndex = 0;

      while (usedSeats.includes(seatIndex) && seatIndex < maxPlayers) {
        seatIndex++;
      }

      if (!alreadyJoined && seatIndex >= maxPlayers) {
        Alert.alert("Room Full", "Koi seat available nahi hai.");
        return;
      }

      // 7. Player record RTDB mein save karo
      const playerData = {
        uid,
        name: user.name || localUser.name || "Player",
        playerId: user.playerId || localUser.playerId || "",
        coins: Number(user.coins ?? localUser.coins ?? 10000),
        isConnected: true,
        seatIndex: alreadyJoined ? players[uid].seatIndex : seatIndex,
      };

      const updates = {
        [`Rooms/${roomId}/players/${uid}`]: playerData,
        [`users/${uid}/activeRoom`]: roomId,
      };

      // RTDB aur Firestore alag databases hain.
      // Is update mein sirf RTDB path use ho sakta hai,
      // isliye player record pehle RTDB mein save karte hain.
      await update(ref(db), {
        [`Rooms/${roomId}/players/${uid}`]: playerData,
      });

      // 8. Firestore profile par activeRoom save karo
     await updateDoc(userRef, {
       activeRoom: roomId,
     });

      // 9. Local user data bhi update karo
      await AsyncStorage.setItem(
        "user",
        JSON.stringify({
          ...localUser,
          uid,
          name: playerData.name,
          playerId: playerData.playerId,
          coins: playerData.coins,
          activeRoom: roomId,
        }),
      );

      // 10. Temporary Room route par jao
      router.push({
        pathname: "/Room",
        params: { roomId },
      });
    } catch (error) {
      console.log("Join room error:", error);

      Alert.alert(
        "Join Failed",
        error?.message || "Room join nahi ho saka. Dobara try karo.",
      );
    } finally {
      setJoiningRoom("");
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38BDF8" />
        <Text style={styles.loadingText}>Loading rooms...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Online Play</Text>

      <Text style={styles.subtitle}>
        Join a public room and play with random players.
      </Text>

      {ROOM_NAMES.map((roomId, index) => {
        const room = rooms[roomId];
        const status = room?.status || "unavailable";
        const players = room?.players || {};
        const playerCount = Object.keys(players).length;
        const maxPlayers = room?.maxPlayers || 5;
        const isWaiting = status === "waiting" && playerCount < maxPlayers;
        const isJoining = joiningRoom === roomId;

        return (
          <View key={roomId} style={styles.roomCard}>
            <View style={styles.roomInfo}>
              <View style={styles.roomIcon}>
                <Text style={styles.roomNumber}>{index + 1}</Text>
              </View>

              <View style={styles.roomDetails}>
                <Text style={styles.roomTitle}>{roomId}</Text>
                <Text style={styles.roomSubtitle}>
                  {playerCount}/{maxPlayers} players
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.statusBadge,
                isWaiting ? styles.waitingBadge : styles.otherBadge,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  isWaiting ? styles.waitingDot : styles.otherDot,
                ]}
              />

              <Text
                style={[
                  styles.statusText,
                  isWaiting ? styles.waitingText : styles.otherText,
                ]}
              >
                {!room
                  ? "Unavailable"
                  : status === "active"
                    ? "In Game"
                    : status === "finished"
                      ? "Finished"
                      : playerCount >= maxPlayers
                        ? "Full"
                        : status === "waiting"
                          ? "Waiting"
                          : "Unavailable"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.joinButton,
                (!isWaiting || joiningRoom !== "") && styles.disabledButton,
              ]}
              disabled={!isWaiting || joiningRoom !== ""}
              onPress={() => handleJoinRoom(roomId)}
              activeOpacity={0.8}
            >
              {isJoining ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.joinButtonText}>
                  {isWaiting ? "Join Room" : "Unavailable"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1020",
  },
  content: {
    padding: 18,
    paddingBottom: 35,
  },
  center: {
    flex: 1,
    backgroundColor: "#0B1020",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#CBD5E1",
    marginTop: 12,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 10,
  },
  subtitle: {
    color: "#94A3B8",
    fontSize: 14,
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 21,
  },
  roomCard: {
    backgroundColor: "#141C30",
    borderWidth: 1,
    borderColor: "#26344D",
    borderRadius: 18,
    padding: 16,
    marginBottom: 15,
  },
  roomInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#153451",
    borderWidth: 1,
    borderColor: "#25618A",
    justifyContent: "center",
    alignItems: "center",
  },
  roomNumber: {
    color: "#38BDF8",
    fontSize: 21,
    fontWeight: "800",
  },
  roomDetails: {
    flex: 1,
    marginLeft: 13,
  },
  roomTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  roomSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 15,
  },
  waitingBadge: {
    backgroundColor: "#12372F",
  },
  otherBadge: {
    backgroundColor: "#332A20",
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 7,
  },
  waitingDot: {
    backgroundColor: "#34D399",
  },
  otherDot: {
    backgroundColor: "#FBBF24",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  waitingText: {
    color: "#6EE7B7",
  },
  otherText: {
    color: "#FCD34D",
  },
  joinButton: {
    backgroundColor: "#0284C7",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: "#334155",
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
