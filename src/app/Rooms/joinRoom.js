import { ref, runTransaction } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import { db, firestore } from "../../app/utils/Firebase";
import { MAX_PLAYERS, ROOM_STATUS } from "./constants";

// Returns: { ok: true } or { ok: false, reason }
// reasons: "no_coins" | "in_other_room" | "unavailable"
export async function joinRoom(roomId, user) {
  const uid = user.uid;
  const balance = Number(user.coins);

  if (!Number.isFinite(balance) || balance <= 0) {
    return { ok: false, reason: "no_coins" };
  }

  if (user.activeRoom && user.activeRoom !== roomId) {
    return { ok: false, reason: "in_other_room" };
  }

  const result = await runTransaction(ref(db, `Rooms/${roomId}`), (room) => {
    // First attempt can be null (local cache empty); server retries with real data
    if (!room) return room;

    const players = room.players || {};

    // Already inside: no change
    if (players[uid]) return room;

    if (room.status !== ROOM_STATUS.WAITING) return; // abort

    const maxPlayers = room.maxPlayers || MAX_PLAYERS;
    if (Object.keys(players).length >= maxPlayers) return; // abort

    const usedSeats = Object.values(players).map((p) => p.seatIndex);
    let seatIndex = 0;
    while (usedSeats.includes(seatIndex)) seatIndex++;
    if (seatIndex >= maxPlayers) return; // abort

    return {
      ...room,
      players: {
        ...players,
        [uid]: {
          uid,
          name: user.name || "Player",
          playerId: user.playerId || "",
          coins: balance,
          isConnected: true,
          seatIndex,
        },
      },
      hostId: room.hostId || uid,
    };
  });

  // Confirm we are really in the room (room may not exist at all)
  const finalRoom = result.snapshot.val();
  if (!result.committed || !finalRoom?.players?.[uid]) {
    return { ok: false, reason: "unavailable" };
  }

  await updateDoc(doc(firestore, "users", uid), { activeRoom: roomId });

  return { ok: true };
}
