import { useLocalSearchParams } from "expo-router";
import { onValue, ref, runTransaction } from "firebase/database";
import { useEffect, useState } from "react";
import {
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import LeaveRoom from "./components/LeaveRoom";
import Loader from "./components/Loader";
import { useAuth } from "./context/Authcontext";
import { db } from "./utils/Firebase";

const BID_AMOUNTS = [100, 250, 500, 1000, 2000];

// Auction timing
const AUCTION_DURATION = 15;
const AUCTION_DURATION_MS = AUCTION_DURATION * 1000;

// Convert values like "1,200" or "$1,200" into numbers
const parseMoney = (value) => {
  if (typeof value === "number") return value;

  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));

  return Number.isFinite(parsed) ? parsed : 0;
};

export default function Game() {
  const { roomId } = useLocalSearchParams();

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { user, loading: authLoading } = useAuth();

  // Listen to room data
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
        console.log("Game listener error:", error);

        Toast.show({
          type: "error",
          text1: "Failed to load game data.",
        });

        setLoading(false);
      },
    );

    return unsubscribe;
  }, [roomId]);

  // Room data
  const players = Object.values(room?.players || {}).sort(
    (a, b) => a.seatIndex - b.seatIndex,
  );

  const currentItem = room?.gameItems?.[room?.currentItemIndex || 0];

  const currentBid = room?.currentBidPrice || 0;

  const imageurl = currentItem?.imageurl;

  const winner = players.find((player) => player.uid === room?.winnerId);

  const auctionEndsAt = room?.auctionEndsAt || 0;

  const remainingSeconds = auctionEndsAt
    ? Math.max(0, Math.ceil((auctionEndsAt - currentTime) / 1000))
    : AUCTION_DURATION;

  // Countdown stage
 let auctionStage = "BIDDING";

 if (remainingSeconds <= 10 && remainingSeconds > 7) {
   auctionStage = "GOING ONCE";
 } else if (remainingSeconds <= 7 && remainingSeconds > 4) {
   auctionStage = "GOING TWICE";
 } else if (remainingSeconds <= 4 && remainingSeconds > 0) {
   auctionStage = "GOING THRICE";
 }

  // Reset image error when item changes
  useEffect(() => {
    setImageError(false);
  }, [currentItem?.id, imageurl]);

  // Initialize countdown for a new auction
  useEffect(() => {
    if (!roomId || room?.status !== "playing") return;
    if (room?.auctionStatus !== "bidding") return;
    if (room?.auctionEndsAt) return;

    const roomRef = ref(db, `Rooms/${roomId}`);

    runTransaction(roomRef, (currentRoom) => {
      if (!currentRoom) return;
      if (currentRoom.status !== "playing") return;
      if (currentRoom.auctionStatus !== "bidding") return;

      // Another client may already have initialized the timer
      if (currentRoom.auctionEndsAt) return;

      return {
        ...currentRoom,
        auctionStartedAt: Date.now(),
        auctionEndsAt: Date.now() + AUCTION_DURATION_MS,
      };
    }).catch((error) => {
      console.log("Auction timer initialization error:", error);
    });
  }, [roomId, room?.status, room?.auctionStatus, room?.auctionEndsAt]);

  // Handle bidding
  const handleBid = async (amount) => {
    if (!user?.uid || actionLoading || amount <= 0) return;

    if (room?.auctionStatus !== "bidding") return;

    setActionLoading(true);

    try {
      const roomRef = ref(db, `Rooms/${roomId}`);

      const result = await runTransaction(roomRef, (currentRoom) => {
        if (!currentRoom) return;
        if (currentRoom.status !== "playing") return;
        if (currentRoom.auctionStatus !== "bidding") return;

        // Do not accept bids after countdown ends
        if (
          !currentRoom.auctionEndsAt ||
          Date.now() >= currentRoom.auctionEndsAt
        ) {
          return;
        }

        const players = { ...(currentRoom.players || {}) };

        const bidder = players[user.uid];

        if (!bidder) return;

        const currentBid = Number(currentRoom.currentBidPrice || 0);
        const previousBidderId = currentRoom.currentHighBidder || "";

        // Buttons represent bid increments
        const newBid = currentBid + amount;

        const bidderCoins = Number(bidder.coins || 0);

        // If the same player increases their bid,
        // only deduct the additional increment.
        const requiredCoins = previousBidderId === user.uid ? amount : newBid;

        if (bidderCoins < requiredCoins) return;

        // Refund the previous highest bidder
        if (previousBidderId && previousBidderId !== user.uid) {
          const previousBidder = players[previousBidderId];

          if (!previousBidder) return;

          previousBidder.coins = Number(previousBidder.coins || 0) + currentBid;
        }

        // Deduct the correct amount from the new bidder
        bidder.coins = bidderCoins - requiredCoins;

        return {
          ...currentRoom,
          players,
          currentBidPrice: newBid,
          currentHighBidder: user.uid,

          // Every new bid resets the countdown
          auctionStartedAt: Date.now(),
          auctionEndsAt: Date.now() + AUCTION_DURATION_MS,
        };
      });

      if (!result.committed) {
        Toast.show({
          type: "error",
          text1: "Bid Failed",
          text2: "Insufficient coins or auction has ended.",
        });
      } else {
        Toast.show({
          type: "success",
          text1: "Bid Placed!",
          text2: `Your new bid is $${currentBid + amount}`,
        });
      }
    } catch (error) {
      console.log("Bid Error:", error);

      Toast.show({
        type: "error",
        text1: "Something went wrong",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Countdown and auction settlement
  useEffect(() => {
    if (!roomId || room?.status !== "playing") return;
    if (room?.auctionStatus !== "bidding") return;
    if (!room?.auctionEndsAt) return;

    const interval = setInterval(async () => {
      const now = Date.now();

      setCurrentTime(now);

      if (now < room.auctionEndsAt) return;

      try {
        const roomRef = ref(db, `Rooms/${roomId}`);

        await runTransaction(roomRef, (currentRoom) => {
          if (!currentRoom) return;
          if (currentRoom.status !== "playing") return;
          if (currentRoom.auctionStatus !== "bidding") return;

          if (!currentRoom.auctionEndsAt) return;
          if (Date.now() < currentRoom.auctionEndsAt) return;

          const players = { ...(currentRoom.players || {}) };

          const winnerId = currentRoom.currentHighBidder || "";
          const winningBid = Number(currentRoom.currentBidPrice || 0);

          // No player placed a bid
          if (!winnerId || winningBid <= 0) {
            return {
              ...currentRoom,
              auctionStatus: "finished",
              resultType: "unsold",
              winnerId: "",
              winningBid: 0,
              actualValue: 0,
              profit: 0,
            };
          }

          const winningPlayer = players[winnerId];

          if (!winningPlayer) return;

          // Actual item value:
          // Uses value first, then actualValue, then price.
          const actualValue = parseMoney(
            currentRoom.gameItems?.[currentRoom.currentItemIndex || 0]?.value ??
              currentRoom.gameItems?.[currentRoom.currentItemIndex || 0]
                ?.actualValue ??
              currentRoom.gameItems?.[currentRoom.currentItemIndex || 0]?.price,
          );

          // Agreed economy rule:
          // Winning bid is already deducted.
          // Credit the winner with actualValue - winningBid.
          const profit = actualValue - winningBid;

          winningPlayer.coins = Number(winningPlayer.coins || 0) + profit;

          return {
            ...currentRoom,
            players,
            auctionStatus: "finished",
            resultType: "sold",
            winnerId,
            winningBid,
            actualValue,
            profit,
          };
        });
      } catch (error) {
        console.log("Auction settlement error:", error);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [roomId, room?.status, room?.auctionStatus, room?.auctionEndsAt]);

  // Update local countdown display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Automatically start next item after result
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
              auctionEndsAt: null,
              auctionStartedAt: null,
            };
          }

          // Start next auction
          return {
            ...currentRoom,
            currentItemIndex: nextIndex,
            currentRound: nextIndex + 1,

            currentBidPrice: 0,
            currentHighBidder: "",

            auctionStatus: "bidding",
            auctionEndsAt: null,
            auctionStartedAt: null,

            winnerId: "",
            winningBid: 0,
            actualValue: 0,
            profit: 0,
            resultType: "",
          };
        });
      } catch (error) {
        console.log("Automatic Next Round Error:", error);
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, [roomId, room?.status, room?.auctionStatus, room?.currentItemIndex]);

  // Loading
  if (loading || authLoading || !user || !room) {
    return <Loader />;
  }

  // Game completed
  if (room.status === "completed") {
    return <LeaveRoom />;
  }

  if (!currentItem) {
    return <LeaveRoom />;
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>BID IT WIN IT</Text>
          <Text style={styles.room}>ROOM: {roomId}</Text>
        </View>

        <View style={styles.coinsBox}>
          <Text style={styles.coinsLabel}>YOUR BALANCE</Text>
          <Text style={styles.coins}>
            🪙{" "}
            {Number(
              players.find((p) => p.uid === user.uid)?.coins || 0,
            ).toLocaleString()}
          </Text>
        </View>
      </View>

      {/* ITEM INFO */}
      <View style={styles.itemCard}>
        <View style={styles.itemImageBox}>
          {imageurl && !imageError ? (
            <Image
              source={{ uri: imageurl }}
              style={styles.image}
              resizeMode="contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.text}>No Image</Text>
            </View>
          )}
        </View>

        <View style={styles.itemDetails}>
          <Text style={styles.itemNumber}>
            ITEM {(room.currentItemIndex || 0) + 1} / {room.gameItems.length}
          </Text>

          <Text style={styles.itemName} numberOfLines={2}>
            {currentItem.name}
          </Text>

          <Text style={styles.description} numberOfLines={3}>
            {currentItem.description}
          </Text>
        </View>
      </View>

      {/* HIGHEST BID + TIMER */}
      <View style={styles.auctionInfo}>
        <View style={styles.bidBox}>
          <Text style={styles.bidLabel}>HIGHEST BID</Text>

          <Text style={styles.bidPrice}>${currentBid.toLocaleString()}</Text>

          <Text style={styles.bidder} numberOfLines={1}>
            {players.find((p) => p.uid === room.currentHighBidder)?.name ||
              "No bids yet"}
          </Text>
        </View>

        {room.auctionStatus === "bidding" && (
          <View style={styles.timerBox}>
            <Text style={styles.timerStage}>
              {!room.auctionEndsAt ? "GET READY" : auctionStage}
            </Text>

            <Text style={styles.timer}>{remainingSeconds}s</Text>
          </View>
        )}
      </View>

      {/* PLAYER TABLE */}
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

          const isHighestBidder = player?.uid === room.currentHighBidder;

          return (
            <View
              key={seatIndex}
              style={[styles.characterSeat, styles[`seat${seatIndex + 1}`]]}
            >
              <View
                style={[
                  styles.profileBorder,
                  player && styles.activeProfile,
                  isHighestBidder && styles.highestBidderProfile,
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

              {player && (
                <View style={styles.nameTag}>
                  <Text style={styles.characterName} numberOfLines={1}>
                    {player.name || "Player"}
                  </Text>
                </View>
              )}

              {isHighestBidder && room.auctionStatus === "bidding" && (
                <Text style={styles.highestBadge}>LEADING</Text>
              )}
            </View>
          );
        })}
      </ImageBackground>

      {/* BIDDING BUTTONS */}
      {room.auctionStatus === "bidding" && (
        <View style={styles.biddingSection}>
          <Text style={styles.buttonHeading}>MAKE YOUR MOVE</Text>

          <View style={styles.buttons}>
            {BID_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.bidButton,
                  (actionLoading || !room.auctionEndsAt) &&
                    styles.disabledButton,
                ]}
                onPress={() => handleBid(amount)}
                disabled={actionLoading || !room.auctionEndsAt}
                activeOpacity={0.75}
              >
                <Text style={styles.buttonText}>
                  +${amount.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.bidHint}>Every new bid resets the countdown</Text>
        </View>
      )}

      {/* RESULT MODAL */}
      {room.auctionStatus === "finished" && (
        <View style={styles.resultOverlay}>
          <View style={styles.resultBox}>
            {winner ? (
              <>
                <Text style={styles.resultEmoji}>🏆</Text>
                <Text style={styles.resultTitle}>ITEM SOLD!</Text>
                <Text style={styles.resultSubtitle}>
                  {winner.name} won this item!
                </Text>

                <View style={styles.resultDetails}>
                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Winning Bid</Text>
                    <Text style={styles.resultValue}>
                      ${Number(room.winningBid || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>Actual Value</Text>
                    <Text style={styles.resultValue}>
                      ${Number(room.actualValue || 0).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>
                      {Number(room.profit || 0) >= 0 ? "Profit" : "Loss"}
                    </Text>
                    <Text
                      style={[
                        styles.profitText,
                        Number(room.profit || 0) < 0 && styles.lossText,
                      ]}
                    >
                      {Number(room.profit || 0) < 0 ? "-" : "+"}$
                      {Math.abs(Number(room.profit || 0)).toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.resultRow}>
                    <Text style={styles.resultLabel}>New Balance</Text>
                    <Text style={styles.resultValue}>
                      ${Number(winner.coins || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.resultEmoji}>📦</Text>
                <Text style={styles.unsoldTitle}>ITEM UNSOLD</Text>
                <Text style={styles.resultSubtitle}>Nobody placed a bid!</Text>
              </>
            )}

            <Text style={styles.nextItemText}>Next item loading...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07111F",
    paddingHorizontal: 15,
    paddingTop: 42,
    paddingBottom: 12,
    justifyContent: "space-between",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  title: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  room: {
    color: "#38BDF8",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 4,
  },

  coinsBox: {
    backgroundColor: "#123B35",
    borderWidth: 1,
    borderColor: "#46E6A5",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 7,
    alignItems: "center",
  },

  coinsLabel: {
    color: "#A8B7CA",
    fontSize: 8,
    fontWeight: "bold",
  },

  coins: {
    color: "#46E6A5",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },

  itemCard: {
    flexDirection: "row",
    width: "100%",
    height: 115,
    backgroundColor: "#0D1B2D",
    borderWidth: 1,
    borderColor: "#24415B",
    borderRadius: 10,
    padding: 9,
    alignItems: "center",
  },

  itemImageBox: {
    width: "36%",
    height: "100%",
    backgroundColor: "#122238",
    borderRadius: 7,
    padding: 5,
    alignItems: "center",
    justifyContent: "center",
  },

  image: {
    width: "100%",
    height: "100%",
  },

  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  itemDetails: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: "center",
  },

  itemNumber: {
    color: "#38BDF8",
    fontSize: 9,
    fontWeight: "bold",
    marginBottom: 5,
  },

  itemName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  description: {
    color: "#A8B7CA",
    fontSize: 10,
    marginTop: 5,
    lineHeight: 14,
  },

  auctionInfo: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    height: 82,
  },

  bidBox: {
    flex: 1,
    backgroundColor: "#0D1B2D",
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },

  bidLabel: {
    color: "#A8B7CA",
    fontSize: 9,
    fontWeight: "bold",
  },

  bidPrice: {
    color: "#FACC15",
    fontSize: 23,
    fontWeight: "900",
    marginTop: 2,
  },

  bidder: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
    maxWidth: "95%",
  },

  timerBox: {
    width: "34%",
    backgroundColor: "#102A40",
    borderWidth: 1,
    borderColor: "#FACC15",
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  timerStage: {
    color: "#FACC15",
    fontSize: 10,
    fontWeight: "900",
  },

  timer: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  characterTable: {
    width: "100%",
    height: 165,
    position: "relative",
    marginTop: 0,
  },

  characterSeat: {
    position: "absolute",
    alignItems: "center",
    width: 60,
  },

  seat1: { left: "0%", top: 23 },
  seat2: { left: "20%", top: 23 },
  seat3: { left: "40%", top: 23 },
  seat4: { left: "60%", top: 23 },
  seat5: { left: "80%", top: 23 },

  profileBorder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#64748B",
    padding: 2,
    backgroundColor: "#07111F",
    overflow: "hidden",
  },

  activeProfile: {
    borderColor: "#38BDF8",
  },

  highestBidderProfile: {
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
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 3,
    maxWidth: 60,
  },

  characterName: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },

  highestBadge: {
    color: "#FACC15",
    fontSize: 8,
    fontWeight: "900",
    marginTop: 3,
  },

  biddingSection: {
    width: "100%",
    alignItems: "center",
  },

  buttonHeading: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 1,
  },

  buttons: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 9,
  },

  bidButton: {
    width: "31.5%",
    minHeight: 43,
    backgroundColor: "#12304A",
    borderWidth: 1,
    borderColor: "#38BDF8",
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.45,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },

  bidHint: {
    color: "#A8B7CA",
    fontSize: 9,
    marginTop: 8,
  },

  resultOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    zIndex: 10,
    elevation: 10,
  },

  resultBox: {
    width: "100%",
    backgroundColor: "#102A40",
    borderWidth: 1,
    borderColor: "#46E6A5",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },

  resultEmoji: {
    fontSize: 38,
    marginBottom: 8,
  },

  resultTitle: {
    color: "#46E6A5",
    fontSize: 24,
    fontWeight: "900",
  },

  unsoldTitle: {
    color: "#FACC15",
    fontSize: 24,
    fontWeight: "900",
  },

  resultSubtitle: {
    color: "#FFFFFF",
    fontSize: 13,
    marginTop: 7,
    textAlign: "center",
  },

  resultDetails: {
    width: "100%",
    backgroundColor: "#0D1B2D",
    borderRadius: 9,
    padding: 12,
    marginTop: 18,
    gap: 12,
  },

  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  resultLabel: {
    color: "#A8B7CA",
    fontSize: 12,
  },

  resultValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },

  profitText: {
    color: "#46E6A5",
    fontSize: 14,
    fontWeight: "900",
  },

  lossText: {
    color: "#F0445E",
  },

  nextItemText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 18,
  },

  text: {
    color: "#FFFFFF",
    textAlign: "center",
  },
});
