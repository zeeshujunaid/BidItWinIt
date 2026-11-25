import { useLocalSearchParams, useRouter } from "expo-router";
import { onValue, ref } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Toast from "react-native-toast-message";
import LeaveRoom from "./components/LeaveRoom";
import Loader from "./components/Loader";
import { useAuth } from "./context/Authcontext";
import {
  initAuctionTimer,
  nextItem,
  placeBid,
  settleAuction,
} from "./Rooms/auction";
import {
  AUCTION_DURATION_MS,
  BID_AMOUNTS,
  NEXT_ITEM_DELAY_MS,
} from "./Rooms/constants";
import { db } from "./utils/Firebase";
import { useRoomPresence } from "./Hooks/useRoomPresence";
import { useSaveCoins } from "./Hooks/useSaveCoins";
import { serverNow } from "./Hooks/serverTime";
import { useBlockBack } from "./Hooks/useBlockBack";

const COLORS = {
  bg: "#0B1020",
  card: "#131D31",
  gold: "#FBBF24",
  goldLight: "#FDE047",
  goldDark: "#F59E0B",
  border: "#293A56",
  muted: "#94A3B8",
  green: "#46E6A5",
  red: "#F0445E",
  dark: "#1A1200",
};

export default function Game() {
  const { roomId } = useLocalSearchParams();
  const router = useRouter();
  useBlockBack();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentTime, setCurrentTime] = useState(serverNow());

  const { user, loading: authLoading } = useAuth();

  // UI-only animation values
  const bidScale = useRef(new Animated.Value(1)).current;
  const timerScale = useRef(new Animated.Value(1)).current;
  const prevBid = useRef(0);

  useRoomPresence(roomId, user?.uid, { removeDisconnected: true });
  useSaveCoins(room, user);

  useEffect(() => {
    if (!room || !user?.uid) return;
    if (!room.players?.[user.uid]) {
      router.replace("/(drawer)/Home");
    }
  }, [room, user?.uid]);

  // Listen to room data
  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, `Rooms/${roomId}`);

    const unsubscribe = onValue(
      roomRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          router.replace("/(drawer)/Home");
          return;
        }
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
    : AUCTION_DURATION_MS / 1000;

  // Countdown stage
  let auctionStage = "BIDDING";

  if (remainingSeconds <= 10 && remainingSeconds > 7) {
    auctionStage = "GOING ONCE";
  } else if (remainingSeconds <= 7 && remainingSeconds > 4) {
    auctionStage = "GOING TWICE";
  } else if (remainingSeconds <= 4 && remainingSeconds > 0) {
    auctionStage = "GOING THRICE";
  }

  // UI-only: last seconds of the auction
  const isUrgent =
    room?.auctionStatus === "bidding" &&
    !!room?.auctionEndsAt &&
    remainingSeconds <= 5 &&
    remainingSeconds > 0;

  // UI-only: pop the price when a new bid comes in
  useEffect(() => {
    if (prevBid.current === currentBid) return;
    prevBid.current = currentBid;

    Animated.sequence([
      Animated.timing(bidScale, {
        toValue: 1.18,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(bidScale, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentBid]);

  // UI-only: pulse the timer in the last 5 seconds
  useEffect(() => {
    if (!isUrgent) {
      timerScale.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(timerScale, {
          toValue: 1.15,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(timerScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [isUrgent]);

  // Reset image error when item changes
  useEffect(() => {
    setImageError(false);
  }, [currentItem?.id, imageurl]);

  // Initialize countdown for a new auction
  useEffect(() => {
    if (!roomId || room?.status !== "playing") return;
    if (room?.auctionStatus !== "bidding") return;
    if (room?.auctionEndsAt) return;

    initAuctionTimer(roomId).catch((e) => console.log("Timer init error:", e));
  }, [roomId, room?.status, room?.auctionStatus, room?.auctionEndsAt]);

  // Handle bidding
  const handleBid = async (amount) => {
    if (!user?.uid || actionLoading || amount <= 0) return;
    if (room?.auctionStatus !== "bidding") return;

    setActionLoading(true);

    try {
      const result = await placeBid(roomId, user.uid, amount);

      if (!result.ok) {
        Toast.show({
          type: "error",
          text1:
            result.reason === "already_leading"
              ? "You are already the highest bidder"
              : "Bid Failed",
          text2:
            result.reason === "already_leading"
              ? "Wait for someone to outbid you."
              : "Insufficient coins or auction has ended.",
        });
      } else {
        Toast.show({
          type: "success",
          text1: "Bid Placed!",
          text2: `Your new bid is $${result.newBid}`,
        });
      }
    } catch (error) {
      console.log("Bid Error:", error);
      Toast.show({ type: "error", text1: "Something went wrong" });
    } finally {
      setActionLoading(false);
    }
  };

  const onBidPress = (amount) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // haptics not available, ignore
    }
    handleBid(amount);
  };

  // Auction settlement when timer ends
  useEffect(() => {
    if (!roomId || room?.status !== "playing") return;
    if (room?.auctionStatus !== "bidding") return;
    if (!room?.auctionEndsAt) return;

    let settling = false;

    const interval = setInterval(async () => {
      if (settling) return;
      if (serverNow() < room.auctionEndsAt) return;

      settling = true;
      try {
        await settleAuction(roomId);
      } catch (error) {
        console.log("Auction settlement error:", error);
      } finally {
        settling = false;
      }
    }, 250);

    return () => clearInterval(interval);
  }, [roomId, room?.status, room?.auctionStatus, room?.auctionEndsAt]);

  // Update local countdown display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(serverNow());
    }, 250);

    return () => clearInterval(interval);
  }, []);

  // Automatically start next item after result
  useEffect(() => {
    if (room?.status !== "playing") return;
    if (room?.auctionStatus !== "finished") return;

    const timer = setTimeout(() => {
      nextItem(roomId).catch((e) => console.log("Next item error:", e));
    }, NEXT_ITEM_DELAY_MS);

    return () => clearTimeout(timer);
  }, [roomId, room?.status, room?.auctionStatus, room?.currentItemIndex]);

  // Loading
  if (loading || authLoading || !user || !room) {
    return <Loader />;
  }

  if (
    room.status === "completed" &&
    room.completionReason === "one_player_remaining"
  ) {
    if (room.players?.[user.uid]) {
      return <LeaveRoom showLastPlayerModal />;
    }

    return <Loader />;
  }

  if (!currentItem) {
    return <LeaveRoom />;
  }

  if (room.status === "completed") {
    return (
      <LeaveRoom
        finalCoins={players.find((p) => p.uid === user.uid)?.coins || 0}
        showCompleted
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* HEADER */}
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <LeaveRoom />
          </View>
          <View
            style={{ flexDirection: "column", alignItems: "center", gap: 6 }}
          >
            <Text style={styles.title}>
              BID IT <Text style={styles.titleGold}>WIN IT</Text>
            </Text>
            <View style={styles.roomChip}>
              <Ionicons name="key" size={9} color={COLORS.gold} />
              <Text style={styles.room}>{roomId}</Text>
            </View>
          </View>
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
              <Ionicons name="cube-outline" size={28} color={COLORS.muted} />
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

          <Animated.Text
            style={[styles.bidPrice, { transform: [{ scale: bidScale }] }]}
          >
            ${currentBid.toLocaleString()}
          </Animated.Text>

          <Text style={styles.bidder} numberOfLines={1}>
            {players.find((p) => p.uid === room.currentHighBidder)?.name ||
              "No bids yet"}
          </Text>
        </View>

        {room.auctionStatus === "bidding" && (
          <View style={[styles.timerBox, isUrgent && styles.timerBoxUrgent]}>
            <Text
              style={[styles.timerStage, isUrgent && styles.timerStageUrgent]}
            >
              {!room.auctionEndsAt ? "GET READY" : auctionStage}
            </Text>

            <Animated.Text
              style={[
                styles.timer,
                isUrgent && styles.timerUrgent,
                { transform: [{ scale: timerScale }] },
              ]}
            >
              {remainingSeconds}s
            </Animated.Text>
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
                    <Ionicons
                      name="add"
                      size={20}
                      color="rgba(251, 191, 36, 0.7)"
                    />
                  </View>
                )}
              </View>

              {player && (
                <View
                  style={[
                    styles.nameTag,
                    isHighestBidder && styles.nameTagLeading,
                  ]}
                >
                  <Text style={styles.characterName} numberOfLines={1}>
                    {player.name || "Player"}
                  </Text>
                </View>
              )}

              {isHighestBidder && room.auctionStatus === "bidding" && (
                <Text style={styles.highestBadge}>👑 LEADING</Text>
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
                  styles.bidButtonWrap,
                  (actionLoading || !room.auctionEndsAt) &&
                    styles.disabledButton,
                ]}
                onPress={() => onBidPress(amount)}
                disabled={actionLoading || !room.auctionEndsAt}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.goldLight, COLORS.goldDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bidButton}
                >
                  <Text style={styles.buttonText}>
                    +${amount.toLocaleString()}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.bidHint}>Every new bid resets the countdown</Text>
        </View>
      )}

      {/* RESULT MODAL */}
      {room.auctionStatus === "finished" && (
        <View style={styles.resultOverlay}>
          <View style={[styles.resultBox, !winner && styles.resultBoxUnsold]}>
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
                    <Text style={styles.resultBalance}>
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
    backgroundColor: COLORS.bg,
    paddingHorizontal: 15,
    paddingTop: 42,
    paddingBottom: 12,
    justifyContent: "space-between",
    overflow: "hidden",
  },

  glowTop: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.goldDark,
    opacity: 0.12,
    top: -150,
    right: -110,
  },

  glowBottom: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#7C3AED",
    opacity: 0.1,
    bottom: -120,
    left: -100,
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

  titleGold: {
    color: COLORS.gold,
  },

  roomChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  room: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  coinsBox: {
    backgroundColor: "#1B1A14",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 7,
    alignItems: "center",
  },

  coinsLabel: {
    color: "#FDE68A",
    fontSize: 8,
    fontWeight: "bold",
    opacity: 0.8,
  },

  coins: {
    color: COLORS.goldLight,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },

  itemCard: {
    flexDirection: "row",
    width: "100%",
    height: 115,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
    borderRadius: 12,
    padding: 9,
    alignItems: "center",
  },

  itemImageBox: {
    width: "36%",
    height: "100%",
    backgroundColor: "#0B1020",
    borderRadius: 8,
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
    gap: 4,
  },

  itemDetails: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: "center",
  },

  itemNumber: {
    color: COLORS.gold,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 5,
  },

  itemName: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  description: {
    color: COLORS.muted,
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
    backgroundColor: "#1B1A14",
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },

  bidLabel: {
    color: "#FDE68A",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    opacity: 0.8,
  },

  bidPrice: {
    color: COLORS.goldLight,
    fontSize: 25,
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
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: "rgba(251, 191, 36, 0.55)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  timerBoxUrgent: {
    borderColor: COLORS.red,
    backgroundColor: "rgba(240, 68, 94, 0.12)",
  },

  timerStage: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  timerStageUrgent: {
    color: "#FF8A9B",
  },

  timer: {
    color: "#FFFFFF",
    fontSize: 27,
    fontWeight: "900",
    marginTop: 2,
  },

  timerUrgent: {
    color: COLORS.red,
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

  seat1: { left: "4%", top: 23 },
  seat2: { left: "22%", top: 23 },
  seat3: { left: "41%", top: 23 },
  seat4: { left: "61%", top: 23 },
  seat5: { left: "79%", top: 23 },

  profileBorder: {
    width: 48,
    height: 48,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#475569",
    padding: 2,
    backgroundColor: COLORS.bg,
    overflow: "hidden",
  },

  activeProfile: {
    borderColor: "rgba(251, 191, 36, 0.5)",
  },

  highestBidderProfile: {
    borderColor: COLORS.goldLight,
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

  nameTag: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 3,
    maxWidth: 60,
  },

  nameTagLeading: {
    borderWidth: 1,
    borderColor: "rgba(253, 224, 71, 0.7)",
  },

  characterName: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },

  highestBadge: {
    color: COLORS.goldLight,
    fontSize: 8,
    fontWeight: "900",
    marginTop: 3,
  },

  biddingSection: {
    width: "100%",
    alignItems: "center",
  },

  buttonHeading: {
    color: COLORS.gold,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
    letterSpacing: 2,
  },

  buttons: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 9,
  },

  bidButtonWrap: {
    width: "31.5%",
    borderRadius: 10,
    overflow: "hidden",
  },

  bidButton: {
    minHeight: 43,
    alignItems: "center",
    justifyContent: "center",
  },

  disabledButton: {
    opacity: 0.45,
  },

  buttonText: {
    color: COLORS.dark,
    fontWeight: "900",
    fontSize: 13,
  },

  bidHint: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 8,
  },

  resultOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.82)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
    zIndex: 10,
    elevation: 10,
  },

  resultBox: {
    width: "100%",
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
  },

  resultBoxUnsold: {
    borderColor: "#475569",
  },

  resultEmoji: {
    fontSize: 38,
    marginBottom: 8,
  },

  resultTitle: {
    color: COLORS.gold,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },

  unsoldTitle: {
    color: COLORS.muted,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },

  resultSubtitle: {
    color: "#FFFFFF",
    fontSize: 13,
    marginTop: 7,
    textAlign: "center",
  },

  resultDetails: {
    width: "100%",
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: "#273247",
    borderRadius: 10,
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
    color: COLORS.muted,
    fontSize: 12,
  },

  resultValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },

  resultBalance: {
    color: COLORS.goldLight,
    fontSize: 14,
    fontWeight: "900",
  },

  profitText: {
    color: COLORS.green,
    fontSize: 15,
    fontWeight: "900",
  },

  lossText: {
    color: COLORS.red,
  },

  nextItemText: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: "bold",
    marginTop: 18,
  },

  text: {
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 10,
  },
});
