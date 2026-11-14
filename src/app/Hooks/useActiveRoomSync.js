import { useEffect } from "react";
import { ref, get } from "firebase/database";
import { doc, updateDoc } from "firebase/firestore";
import { db, firestore } from "../utils/Firebase";

// Agar user.activeRoom set hai lekin wo us room mein nahi, to clear kar do
export function useActiveRoomSync(user) {
  useEffect(() => {
    const uid = user?.uid;
    const roomId = user?.activeRoom;
    if (!uid || !roomId) return;

    let cancelled = false;

    (async () => {
      try {
        const snap = await get(ref(db, `Rooms/${roomId}/players/${uid}`));
        if (!cancelled && !snap.exists()) {
          await updateDoc(doc(firestore, "users", uid), { activeRoom: "" });
        }
      } catch (error) {
        console.log("Active room sync error:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, user?.activeRoom]);
}
