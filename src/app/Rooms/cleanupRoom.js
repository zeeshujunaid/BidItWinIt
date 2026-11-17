import { ref, runTransaction } from "firebase/database";
import { db } from "../utils/Firebase";
import { ROOM_STATUS, RESET_KEYS } from "./constants";

// Room stale hai agar:
// 1) koi player nahi lekin room waiting par nahi ya purana data pada hai
// 2) players hain lekin sab ki presence false hai
export function isRoomStale(room) {
  if (!room) return false;

  const ids = Object.keys(room.players || {});

  if (ids.length === 0) {
    const hasLeftovers = RESET_KEYS.some((k) => room[k] !== undefined);
    return room.status !== ROOM_STATUS.WAITING || hasLeftovers;
  }

  return ids.every((id) => room.presence?.[id] === false);
}

const inFlight = new Set();

export async function cleanupStaleRoom(roomId) {
  if (inFlight.has(roomId)) return;
  inFlight.add(roomId);

  try {
    await runTransaction(ref(db, `Rooms/${roomId}`), (room) => {
      if (!room) return room;

      // Transaction ke andar dobara check: shayad koi wapas aa gaya
      if (!isRoomStale(room)) return;
      if (room.isPrivate) return null;

      const reset = { ...room, status: ROOM_STATUS.WAITING, hostId: "" };
      RESET_KEYS.forEach((k) => delete reset[k]);
      return reset;
    });
  } catch (error) {
    console.log("Stale room cleanup error:", error);
  } finally {
    inFlight.delete(roomId);
  }
}
