import { ref, runTransaction } from "firebase/database";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, firestore } from "../../app/utils/Firebase";
import { MAX_PLAYERS, ROOM_STATUS } from "./constants";

// Returns: { ok: true } or { ok: false, reason }
// reasons: "no_coins" | "in_other_room" | "unavailable"

export async function joinRoom(roomId, user) {
  const uid = user.uid;

  // Get actual profile data from Firestore
  const userRef = doc(firestore, "users", uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return { ok: false, reason: "unavailable" };
  }

  const userData = userSnap.data();
  const balance = Number(userData.coins);

  if (!Number.isFinite(balance) || balance <= 0) {
    return { ok: false, reason: "no_coins" };
  }

  if (userData.activeRoom && userData.activeRoom !== roomId) {
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
          name: userData.name || "Player",
          playerId: userData.playerId || "",
          coins: balance,
          isConnected: true,
          profilePic: userData.profilePic || "",
          seatIndex,
        },
      },
      hostId: room.hostId || uid,
    };
  });

  // Confirm we are really in the room
  const finalRoom = result.snapshot.val();

  if (!result.committed || !finalRoom?.players?.[uid]) {
    return { ok: false, reason: "unavailable" };
  }

  await updateDoc(userRef, { activeRoom: roomId });

  return { ok: true };
}
