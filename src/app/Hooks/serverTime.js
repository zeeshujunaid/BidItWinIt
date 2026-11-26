import { ref, onValue } from "firebase/database";
import { db } from "../utils/Firebase";

let offset = 0;
let initialized = false;

let resolveServerTime;
const serverTimeReady = new Promise((resolve) => {
  resolveServerTime = resolve;
});

onValue(ref(db, ".info/serverTimeOffset"), (snapshot) => {
  offset = Number(snapshot.val()) || 0;

  if (!initialized) {
    initialized = true;
    resolveServerTime();
  }
});

export const waitForServerTime = () => serverTimeReady;

export const serverNow = () => Date.now() + offset;
