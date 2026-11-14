import { useEffect } from "react";
import {
  ref,
  onValue,
  onDisconnect,
  set,
  get,
  runTransaction,
} from "firebase/database";
import { db } from "../utils/Firebase";
import { ROOM_STATUS, RESET_KEYS } from "../Rooms/constants";

// Disconnected player ko hatao (waiting, playing aur completed teeno mein)
async function removeDisconnectedPlayer(roomId, uid) {
  try {
    await runTransaction(ref(db, `Rooms/${roomId}`), (room) => {
      if (!room) return room;

      // Beech mein wapas connect ho gaya: kuch mat karo
      if (room.presence?.[uid] !== false) return;

      const presence = { ...(room.presence || {}) };
      delete presence[uid];

      // Player pehle se nikla hua: sirf ghost presence saaf karo
      if (!room.players?.[uid]) return { ...room, presence };

      const players = { ...room.players };
      delete players[uid];

      const remaining = Object.entries(players).sort(
        ([, a], [, b]) => (a.seatIndex ?? 0) - (b.seatIndex ?? 0),
      );

      // 1) Koi nahi bacha: room reset
      if (remaining.length === 0) {
        const reset = { ...room, status: ROOM_STATUS.WAITING, hostId: "" };
        RESET_KEYS.forEach((k) => delete reset[k]);
        return reset;
      }

      const [remainingUid, remainingPlayer] = remaining[0];
      const hostId = room.hostId === uid ? remainingUid : room.hostId;
      const isPlaying = room.status === ROOM_STATUS.PLAYING;
      const isBidding = room.auctionStatus === "bidding";

      let next = { ...room, players, presence, hostId };

      // Jo disconnect hua wo highest bidder tha: bid hata do
      if (isPlaying && isBidding && room.currentHighBidder === uid) {
        next.currentBidPrice = 0;
        next.currentHighBidder = "";
      }

      // 2) Game chal raha tha aur sirf 1 player bacha: game khatam
      if (isPlaying && remaining.length === 1) {
        // Bacha hua player highest bidder tha to uski bid wapas do
        if (isBidding && room.currentHighBidder === remainingUid) {
          players[remainingUid] = {
            ...remainingPlayer,
            coins:
              Number(remainingPlayer.coins || 0) +
              Number(room.currentBidPrice || 0),
          };
        }

        return {
          ...next,
          players,
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

      // 3) Normal removal
      return next;
    });
  } catch (error) {
    console.log("Remove disconnected error:", error);
  }
}

export function useRoomPresence(
  roomId,
  uid,
  { removeDisconnected = false } = {},
) {
  // 1) Meri presence set karo (sirf agar main room ka player hun)
  useEffect(() => {
    if (!roomId || !uid) return;

    const presenceRef = ref(db, `Rooms/${roomId}/presence/${uid}`);
    const playerRef = ref(db, `Rooms/${roomId}/players/${uid}`);

    const unsubscribe = onValue(ref(db, ".info/connected"), async (snap) => {
      if (snap.val() !== true) return;

      try {
        const me = await get(playerRef);
        if (!me.exists()) return;

        await onDisconnect(presenceRef).set(false);
        await set(presenceRef, true);
      } catch (error) {
        console.log("Presence error:", error);
      }
    });

    return unsubscribe;
  }, [roomId, uid]);

  // 2) Dusron ki disconnect cleanup
  useEffect(() => {
    if (!roomId || !removeDisconnected) return;

    const unsubscribe = onValue(ref(db, `Rooms/${roomId}/presence`), (snap) => {
      const presence = snap.val() || {};
      Object.keys(presence)
        .filter((id) => presence[id] === false)
        .forEach((id) => removeDisconnectedPlayer(roomId, id));
    });

    return unsubscribe;
  }, [roomId, removeDisconnected]);
}
