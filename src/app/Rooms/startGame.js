import { ref, runTransaction } from "firebase/database";
import { collection, getDocs } from "firebase/firestore";
import { db, firestore } from "../../app/utils/Firebase";
import { ROOM_STATUS, ITEMS_PER_GAME, getRandomItems } from "./constants";

// Returns { ok: true } or { ok: false, reason: "no_items" | "cannot_start" }
export async function startGame(roomId, uid) {
  // 1) Items pehle fetch karo (transaction ke bahar)
  const snapshot = await getDocs(collection(firestore, "Gamedata"));
  const allItems = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (allItems.length === 0) return { ok: false, reason: "no_items" };

  const gameItems = getRandomItems(allItems, ITEMS_PER_GAME);

  // 2) Ek hi transaction mein check + start
  const result = await runTransaction(ref(db, `Rooms/${roomId}`), (room) => {
    if (!room) return room; // pehli attempt null ho sakti hai

    if (room.hostId !== uid) return;
    if (room.status !== ROOM_STATUS.WAITING) return;
    if (Object.keys(room.players || {}).length < 2) return;

    return {
      ...room,
      status: ROOM_STATUS.PLAYING,
      gameItems,
      currentItemIndex: 0,
      currentRound: 1,
      currentBidPrice: 0,
      currentHighBidder: "",
      passedPlayers: {},
      auctionStatus: "bidding",
      auctionEndsAt: null,
      auctionStartedAt: null,
    };
  });

  const finalRoom = result.snapshot.val();
  if (!result.committed || finalRoom?.status !== ROOM_STATUS.PLAYING) {
    return { ok: false, reason: "cannot_start" };
  }

  return { ok: true };
}
