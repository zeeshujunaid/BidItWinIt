import { ref, runTransaction } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";

import { db, firestore } from "../../app/utils/Firebase";

import {
  ROOM_STATUS,
  ITEMS_PER_GAME,
  getRandomItems,
  AUCTION_DURATION_MS,
} from "./constants";

import { serverNow, waitForServerTime } from "../Hooks/serverTime";

// Returns:
// { ok: true }
// { ok: false, reason: "no_items" | "cannot_start" }

export async function startGame(roomId, uid) {
  try {
    // 1. Server time initialize hone ka wait karo
    await waitForServerTime();

    // 2. Game items Firestore se fetch karo
    const snapshot = await getDocs(collection(firestore, "Gamedata"));

    const allItems = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    if (allItems.length === 0) {
      return { ok: false, reason: "no_items" };
    }

    const gameItems = getRandomItems(allItems, ITEMS_PER_GAME);

    // 3. Shared auction timer calculate karo
    const now = serverNow();

    // 4. Ek RTDB transaction mein game + timer start karo
    const result = await runTransaction(ref(db, `Rooms/${roomId}`), (room) => {
      if (!room) return room;

      // Only host can start
      if (room.hostId !== uid) return;

      // Room waiting honi chahiye
      if (room.status !== ROOM_STATUS.WAITING) return;

      // Minimum 2 players required
      if (Object.keys(room.players || {}).length < 2) return;

      return {
        ...room,

        // Game status
        status: ROOM_STATUS.PLAYING,

        // Game items
        gameItems,

        // Round information
        currentItemIndex: 0,
        currentRound: 1,

        // Auction information
        currentBidPrice: 0,
        currentHighBidder: "",
        passedPlayers: {},

        // Auction timer
        auctionStatus: "bidding",
        auctionStartedAt: now,
        auctionEndsAt: now + AUCTION_DURATION_MS,

        // Reset previous result data
        winnerId: "",
        winningBid: 0,
        actualValue: 0,
        profit: 0,
        resultType: "",
      };
    });

    // 5. Transaction result check karo
    const finalRoom = result.snapshot.val();

    if (!result.committed || finalRoom?.status !== ROOM_STATUS.PLAYING) {
      return { ok: false, reason: "cannot_start" };
    }

    return { ok: true };
  } catch (error) {
    console.log("Start Game Error:", error);

    return { ok: false, reason: "cannot_start" };
  }
}
