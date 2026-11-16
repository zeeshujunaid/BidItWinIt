import { useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { firestore } from "../utils/Firebase";

// Har item settle hone par (aur game complete par) apne coins Firestore mein save karo
export function useSaveCoins(room, user) {
  const lastKey = useRef("");
  const uid = user?.uid;
  const myCoins = room?.players?.[uid]?.coins;

  useEffect(() => {
    if (!room || !uid) return;
    if (room.auctionStatus !== "finished") return;
    if (room.status !== "playing" && room.status !== "completed") return;

    // Main room mein nahi (leave ho chuka): leaveRooms khud save kar chuka hai
    if (!room.players?.[uid]) return;

    const coins = Math.max(0, Number(myCoins));
    if (!Number.isFinite(coins)) return;

    const key = `${room.status}-${room.currentItemIndex}-${coins}`;
    if (lastKey.current === key) return;
    lastKey.current = key;

    // Firestore mein pehle se yahi balance hai: write bachao
    if (Number(user.coins) === coins) return;

    updateDoc(doc(firestore, "users", uid), { coins }).catch((error) => {
      console.log("Save coins error:", error);
      lastKey.current = ""; // agli baar dobara try ho
    });
  }, [uid, room?.status, room?.auctionStatus, room?.currentItemIndex, myCoins]);
}
