import { onDisconnect, ref, runTransaction } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import { db, firestore } from "../utils/Firebase";
import { ROOM_STATUS } from "./constants";

const RESET_KEYS = [
  "players",
  "presence",
  "gameItems",
  "currentItemIndex",
  "currentRound",
  "currentBidPrice",
  "currentHighBidder",
  "auctionStatus",
  "auctionEndsAt",
  "auctionStartedAt",
  "passedPlayers",
  "phaseEndsAt",
  "winnerId",
  "winningBid",
  "actualValue",
  "profit",
  "resultType",
  "completionReason",
  "activePlayerId",
];

// Returns { ok: true } or { ok: false, reason: "highest_bidder" }
export async function leaveRooms(roomId, uid, finalCoins) {
  let leavingCoins;
  let blocked = false;

  const result = await runTransaction(ref(db, `Rooms/${roomId}`), (room) => {
    // Transaction can run more than once, so reset flags each time
    leavingCoins = undefined;
    blocked = false;

    if (!room) return room;

    const leaving = room.players?.[uid];
    if (!leaving) return room;

    if (room.auctionStatus === "bidding" && room.currentHighBidder === uid) {
      blocked = true;
      return room;
    }

    leavingCoins = Number(leaving.coins);

    const players = { ...room.players };
    delete players[uid];

    const presence = { ...(room.presence || {}) };
    delete presence[uid];

    const remaining = Object.entries(players).sort(
      ([, a], [, b]) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0),
    );

    // 1) Last player: reset room
    if (remaining.length === 0) {
      if (room.isPrivate) return null; 
      const reset = { ...room, status: ROOM_STATUS.WAITING, hostId: "" };
      RESET_KEYS.forEach((k) => delete reset[k]);
      return reset;
    }

    const [remainingUid, remainingPlayer] = remaining[0];
    const hostId = room.hostId === uid ? remainingUid : room.hostId;

    // 2) One player left mid-game: end game
    if (remaining.length === 1 && room.status === ROOM_STATUS.PLAYING) {
      if (
        room.auctionStatus === "bidding" &&
        room.currentHighBidder === remainingUid
      ) {
        players[remainingUid] = {
          ...remainingPlayer,
          coins:
            Number(remainingPlayer.coins || 0) +
            Number(room.currentBidPrice || 0),
        };
      }

      return {
        ...room,
        players,
        presence,
        hostId,
        status: ROOM_STATUS.COMPLETED,
        completionReason: "one_player_remaining",
        activePlayerId: "",
        auctionEndsAt: null,
        auctionStartedAt: null,
        auctionStatus: "finished",
        currentBidPrice: 0,
        currentHighBidder: "",
      };
    }

    // 3) Normal leave
    return { ...room, players, presence, hostId };
  });

  if (!result.committed) throw new Error("Could not leave the room.");
  if (blocked) return { ok: false, reason: "highest_bidder" };

  // Stale onDisconnect handler must not fire later (bug #3)
  try {
    await onDisconnect(ref(db, `Rooms/${roomId}/presence/${uid}`)).cancel();
  } catch (error) {
    console.log("onDisconnect cancel error:", error);
  }

  const propCoins =
    finalCoins === undefined || finalCoins === null ? NaN : Number(finalCoins);
  const coinsToSave = Number.isFinite(propCoins) ? propCoins : leavingCoins;

  const update = { activeRoom: "" };
  if (Number.isFinite(coinsToSave)) update.coins = Math.max(0, coinsToSave);

  await updateDoc(doc(firestore, "users", uid), update);

  return { ok: true };
}
