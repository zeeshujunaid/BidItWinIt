import { ref, onValue } from "firebase/database";
import { db } from "../utils/Firebase";

let offset = 0;

// Ek baar listen karo, offset update hota rahega
onValue(ref(db, ".info/serverTimeOffset"), (snap) => {
  offset = Number(snap.val()) || 0;
});

// Date.now() ki jagah ye use karo
export const serverNow = () => Date.now() + offset;
