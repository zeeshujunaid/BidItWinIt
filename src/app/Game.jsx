import { useLocalSearchParams, useRouter } from "expo-router";
import { onValue, ref, runTransaction } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import LeaveRoom from "./components/LeaveRoom";
import Loader from "./components/Loader";
import { useAuth } from "./context/Authcontext";
import { db, firestore } from "./utils/Firebase";

const BID_AMOUNTS = [100, 250, 500, 1000, 2000];

export default function Game() {
  const { roomId } = useLocalSearchParams();
  const router = useRouter();

  const [room, setRoom] = useState(null);
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, `Rooms/${roomId}`);

    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        setRoom(snapshot.val());
        setLoading(false);
      },
      (error) => {
        Toast.show({
          type: "error",
          text1: "Failed to load game data.",
        });
        console.log("Game listener error:", error);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId]);

  const players = Object.values(room?.players || {}).sort(
    (a, b) => a.seatIndex - b.seatIndex,
  );

  const currentItem = room?.gameItems?.[room?.currentItemIndex || 0];

  const currentBid = room?.currentBidPrice || 0;

  const activePlayer = players.find(
    (player) => player.uid === room?.activePlayerId,
  );

  const isMyTurn = user?.uid === room?.activePlayerId;

  const passedPlayers = room?.passedPlayers || {};

  const imageurl = currentItem?.imageurl;

  useEffect(() => {
    setImageError(false);
  }, [currentItem?.id, imageurl]);

  useEffect(() => {
    if (room?.status !== "playing") return;
    if (room?.auctionStatus !== "finished") return;

    const timer = setTimeout(async () => {
      try {
        const roomRef = ref(db, `Rooms/${roomId}`);

        await runTransaction(roomRef, (currentRoom) => {
          if (!currentRoom) return;
          if (currentRoom.status !== "playing") return;
          if (currentRoom.auctionStatus !== "finished") return;

          const nextIndex = (currentRoom.currentItemIndex || 0) + 1;

          // All items completed
          if (nextIndex >= (currentRoom.gameItems || []).length) {
            return {
              ...currentRoom,
              status: "completed",
              auctionStatus: "finished",
              activePlayerId: "",
            };
          }

          const sortedPlayers = Object.values(currentRoom.players || {}).sort(
            (a, b) => a.seatIndex - b.seatIndex,
          );

          // Start next auction
          return {
            ...currentRoom,
            currentItemIndex: nextIndex,
            currentRound: nextIndex + 1,
            currentBidPrice: 0,
            currentHighBidder: "",
            activePlayerId: sortedPlayers[0]?.uid || "",
            passedPlayers: {},
            auctionStatus: "bidding",
            winnerId: "",
            winningBid: 0,
          };
        });
      } catch (error) {
        console.log("Automatic Next Round Error:", error);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [room?.auctionStatus, room?.status, room?.currentItemIndex, roomId]);

  const finishAuction = (currentRoom, winnerId) => {
    return {
      ...currentRoom,
      auctionStatus: "finished",
      activePlayerId: "",
      winnerId: winnerId || "",
      winningBid: currentRoom.currentBidPrice || 0,
    };
  };

  const handleAuctionAction = async (action, amount = 0) => {
    if (!user?.uid || actionLoading || !isMyTurn) return;

    if (action !== "bid" && action !== "pass") return;
    if (action === "bid" && amount <= 0) return;

    setActionLoading(true);

    try {
      const roomRef = ref(db, `Rooms/${roomId}`);

      const result = await runTransaction(roomRef, (currentRoom) => {
        if (!currentRoom) return;
        if (currentRoom.status !== "playing") return;
        if (currentRoom.auctionStatus === "finished") return;
        if (currentRoom.activePlayerId !== user.uid) return;

        const allPlayers = Object.values(currentRoom.players || {}).sort(
          (a, b) => a.seatIndex - b.seatIndex,
        );

        const passed = { ...(currentRoom.passedPlayers || {}) };

        if (passed[user.uid]) return;

        // 1. Handle BID
        if (action === "bid") {
          const newBid = (currentRoom.currentBidPrice || 0) + amount;

          currentRoom.currentBidPrice = newBid;
          currentRoom.currentHighBidder = user.uid;
        }

        // 2. Handle NO BID
        if (action === "pass") {
          passed[user.uid] = true;
        }

        currentRoom.passedPlayers = passed;

        // 3. Find all players still participating
        const eligiblePlayers = allPlayers.filter(
          (player) => !passed[player.uid],
        );

        const highBidder = currentRoom.currentHighBidder || "";

        // 4. Find challengers other than the highest bidder
        const challengers = eligiblePlayers.filter(
          (player) => player.uid !== highBidder,
        );

        // 5. No challenger left = auction finished
        if (highBidder && challengers.length === 0) {
          return finishAuction(currentRoom, highBidder);
        }

        // 6. Nobody bid and everyone is out
        if (!highBidder && eligiblePlayers.length === 0) {
          return finishAuction(currentRoom, "");
        }

        // 7. Find current player's position
        const currentIndex = allPlayers.findIndex(
          (player) => player.uid === user.uid,
        );

        let nextPlayer = null;

        // 8. Find next player in circular turn order
        // Highest bidder is included here.
        // They get another turn when their turn comes around.
        for (let i = 1; i <= allPlayers.length; i++) {
          const nextIndex = (currentIndex + i) % allPlayers.length;
          const candidate = allPlayers[nextIndex];

          if (candidate && !passed[candidate.uid]) {
            nextPlayer = candidate;
            break;
          }
        }

        // 9. Safety check
        if (!nextPlayer) {
          return finishAuction(currentRoom, highBidder);
        }

        currentRoom.activePlayerId = nextPlayer.uid;

        return currentRoom;
      });

      if (!result.committed) {
        Toast.show({
          type: "error",
          text1: "Action Failed",
          text2: "Your turn is no longer active.",
        });
      }
    } catch (error) {
      console.log("Auction Error:", error);

      Toast.show({
        type: "error",
        text1: "Error",
      });
    } finally {
      setActionLoading(false);
    }
  };


  if (loading || authLoading || !user || !room) {
    return <Loader />;
  }

  if (room.status === "completed") {
    return <LeaveRoom/>;
  }

  if (!currentItem) {
    return <LeaveRoom/>;
  }

  const winner = players.find((player) => player.uid === room.winnerId);
  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>BID IT WIN IT</Text>

      <View style={styles.topInfo}>
        <Text style={styles.room}>ROOM: {roomId}</Text>
        <Text style={styles.round}>
          ITEM {(room.currentItemIndex || 0) + 1} / {room.gameItems.length}
        </Text>
      </View>

      {/* ITEM IMAGE */}
      <View style={styles.itemImageBox}>
        {imageurl && !imageError ? (
          <Image
            source={{ uri: imageurl }}
            style={styles.image}
            resizeMode="contain"
            onError={(error) => {
              console.log("Item image failed:", imageurl, error.nativeEvent);
              setImageError(true);
            }}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.text}>Image not available</Text>
          </View>
        )}
      </View>

      {/* ITEM DETAILS */}
      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{currentItem.name}</Text>
        <Text style={styles.description}>{currentItem.description}</Text>
      </View>

      {/* HIGHEST BID */}
      <View style={styles.bidBox}>
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Text style={styles.bidLabel}>HIGHEST BID</Text>
          <Text style={styles.bidder}>
            {players.find((player) => player.uid === room.currentHighBidder)
              ?.name || "No bids yet"}
          </Text>
        </View>
        <Text style={styles.bidPrice}>${currentBid}</Text>
      </View>

      {/* TURN STATUS */}
      {/* <View style={styles.turnBox}>
      <Text style={styles.turnText}>
        {room.auctionStatus === "finished"
          ? winner
            ? `WINNER: ${winner.name}`
            : "ITEM UNSOLD"
          : activePlayer
            ? `${activePlayer.name}'S TURN`
            : "WAITING..."}
      </Text>
    </View> */}

      {/* CHARACTERS AND TABLE IMAGE */}
      {/* CHARACTERS AND PLAYER PROFILES */}
      <ImageBackground
        source={require("../../assets/images/chracter/waitingchracter.png")}
        style={styles.characterTable}
        resizeMode="stretch"
      >
        {[0, 1, 2, 3, 4].map((seatIndex) => {
          const player = players.find((p) => Number(p.seatIndex) === seatIndex);

          const avatar =
            player?.photoURL ||
            player?.avatarUrl ||
            player?.profilePic ||
            player?.photoUrl;

          const isTurn = player?.uid === room.activePlayerId;

          return (
            <View
              key={seatIndex}
              style={[styles.characterSeat, styles[`seat${seatIndex + 1}`]]}
            >
              {/* PROFILE IMAGE */}
              <View
                style={[
                  styles.profileBorder,
                  player && styles.activeProfile,
                  isTurn && styles.turnProfile,
                ]}
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.profileImage} />
                ) : (
                  <View style={styles.emptyAvatar}>
                    <Text style={styles.plus}>+</Text>
                  </View>
                )}
              </View>

              {/* PLAYER NAME */}
              {player && (
                <View style={styles.nameTag}>
                  <Text style={styles.characterName} numberOfLines={1}>
                    {player.name || "Player"}
                  </Text>
                </View>
              )}

              {/* TURN INDICATOR */}
              {isTurn && room.auctionStatus !== "finished" && (
                <View style={styles.characterTurnBadge}>
                  <Text style={styles.characterTurnText}>YOUR TURN</Text>
                </View>
              )}

              {/* PASSED */}
              {passedPlayers[player?.uid] && (
                <Text style={styles.passedBadge}>PASSED</Text>
              )}
            </View>
          );
        })}
      </ImageBackground>

      {/* RESULT */}
      {room.auctionStatus === "finished" ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>
            {winner ? "ITEM WON!" : "NO ONE BID"}
          </Text>

          <Text style={styles.text}>
            {winner
              ? `${winner.name} won this item for $${room.winningBid}`
              : "This item remained unsold."}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.buttonHeading}>
            {isMyTurn ? "PLACE YOUR BID" : "WAITING FOR PLAYER"}
          </Text>

          {isMyTurn ? (
            <>
              <View style={styles.buttons}>
                {BID_AMOUNTS.map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={[
                      styles.bidButton,
                      actionLoading && styles.disabledButton,
                    ]}
                    onPress={() => handleAuctionAction("bid", amount)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.buttonText}>${amount}</Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[
                    styles.bidButton,
                    styles.noBidButton,
                    actionLoading && styles.disabledButton,
                  ]}
                  onPress={() => handleAuctionAction("pass")}
                  disabled={actionLoading}
                >
                  <Text style={styles.buttonText}>NO BID</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <Text style={styles.waitingText}>
              {activePlayer?.name || "Another player"} is making a decision...
            </Text>
          )}
        </>
      )}

      {/* PLAYER STATUS */}
      {/* <View style={styles.playersSection}>
      <Text style={styles.playersHeading}>PLAYERS</Text>

      {players.map((player) => (
        <View key={player.uid} style={styles.playerCard}>
          <Text style={styles.playerName}>
            {player.name}
            {player.uid === room.activePlayerId ? "  • YOUR TURN" : ""}
            {passedPlayers[player.uid] ? "  • PASSED" : ""}
            {player.uid === room.currentHighBidder ? "  • HIGHEST BID" : ""}
          </Text>
        </View>
      ))}
    </View> */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#07111F",
    paddingHorizontal: 18,
    paddingTop: 45,
    paddingBottom: 30,
    alignItems: "center",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 2,
  },

  topInfo: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 18,
  },

  room: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "bold",
  },

  round: {
    color: "#FACC15",
    fontSize: 12,
    fontWeight: "bold",
  },

  itemImageBox: {
    width: "100%",
    height: 150,
    backgroundColor: "#0D1B2D",
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderRadius: 5,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    width: "100%",
    backgroundColor: "#122238",
    justifyContent: "center",
    alignItems: "center",
  },

  itemDetails: {
    width: "85%",
    borderWidth: 1,
    height: 90,
    borderColor: "#334B68",
    padding: 8,
    alignItems: "center",
    marginTop: 5,
    backgroundColor: "#0D1B2D",
  },

  itemName: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },

  description: {
    color: "#A8B7CA",
    fontSize: 10,
    textAlign: "center",
    marginTop: 5,
  },

  feature: {
    color: "#FACC15",
    fontSize: 11,
    textAlign: "center",
    marginTop: 5,
  },

  bidBox: {
    width: "65%",
    marginTop: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D1B2D",
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderRadius: 5,
  },

  bidLabel: {
    color: "#A8B7CA",
    fontSize: 12,
    fontWeight: "bold",
  },

  bidPrice: {
    color: "#FACC15",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  bidder: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 5,
  },

  turnBox: {
    width: "100%",
    backgroundColor: "#102A40",
    borderWidth: 1,
    borderColor: "#38BDF8",
    padding: 10,
    alignItems: "center",
    marginTop: 12,
    borderRadius: 5,
  },

  turnText: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "900",
  },

  characterTable: {
    width: "100%",
    height: 180,
    position: "relative",
    marginTop: 15,
  },

  characterSeat: {
    position: "absolute",
    alignItems: "center",
    width: 65,
  },

  seat1: {
    left: "1%",
    top: 28,
  },

  seat2: {
    left: "21%",
    top: 28,
  },

  seat3: {
    left: "41%",
    top: 28,
  },

  seat4: {
    left: "61%",
    top: 28,
  },

  seat5: {
    left: "81%",
    top: 28,
  },

  profileBorder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "#64748B",
    padding: 2,
    backgroundColor: "#07111F",
    overflow: "hidden",
  },

  activeProfile: {
    borderColor: "#38BDF8",
  },

  turnProfile: {
    borderColor: "#FACC15",
    borderWidth: 3,
  },

  profileImage: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
  },

  emptyAvatar: {
    flex: 1,
    borderRadius: 50,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },

  plus: {
    color: "#FFFFFF",
    fontSize: 20,
  },

  nameTag: {
    backgroundColor: "#07111F",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 3,
    maxWidth: 65,
  },

  characterName: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },

  characterTurnBadge: {
    backgroundColor: "#FACC15",
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 3,
  },

  characterTurnText: {
    color: "#07111F",
    fontSize: 8,
    fontWeight: "900",
  },

  hostBadge: {
    color: "#FACC15",
    fontSize: 8,
    fontWeight: "bold",
  },

  passedBadge: {
    color: "#F0445E",
    fontSize: 8,
    fontWeight: "bold",
  },
  buttonHeading: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 1,
  },

  buttons: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },

  bidButton: {
    width: "31.5%",
    minHeight: 48,
    backgroundColor: "#102A40",
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  noBidButton: {
    backgroundColor: "#8D2438",
    borderColor: "#F0445E",
  },

  disabledButton: {
    opacity: 0.5,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },

  waitingText: {
    color: "#A8B7CA",
    marginTop: 8,
    textAlign: "center",
  },

  resultBox: {
    width: "100%",
    backgroundColor: "#102A40",
    borderWidth: 1,
    borderColor: "#46E6A5",
    padding: 16,
    borderRadius: 5,
    marginTop: 15,
    alignItems: "center",
  },

  resultTitle: {
    color: "#46E6A5",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 8,
  },

  playersSection: {
    width: "100%",
    marginTop: 20,
  },

  playersHeading: {
    color: "#38BDF8",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },

  playerCard: {
    width: "100%",
    backgroundColor: "#0D1B2D",
    borderWidth: 1,
    borderColor: "#263C54",
    padding: 10,
    marginBottom: 6,
    borderRadius: 4,
  },

  playerName: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },

  text: {
    color: "#FFFFFF",
    textAlign: "center",
  },
});
