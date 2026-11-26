import { ref, runTransaction } from "firebase/database";
import { db } from "../utils/Firebase";
import { ROOM_STATUS, AUCTION_DURATION_MS, parseMoney } from "./constants";
import { serverNow, waitForServerTime } from "../Hooks/serverTime";

const roomRef = (roomId) => ref(db, `Rooms/${roomId}`);

// 1) Naye item ka timer start karo (koi bhi client pehle kare)
export async function initAuctionTimer(roomId) {
   await waitForServerTime();
  await runTransaction(roomRef(roomId), (room) => {
    if (!room) return room;
    if (room.status !== ROOM_STATUS.PLAYING) return;
    if (room.auctionStatus !== "bidding") return;
    if (room.auctionEndsAt) return;

    const now = serverNow();
    return {
      ...room,
      auctionStartedAt: now,
      auctionEndsAt: now + AUCTION_DURATION_MS,
    };
  });
}

// 2) Bid lagao
// Returns { ok: true, newBid } or { ok: false, reason }
// reasons: "failed" | "already_leading"
export async function placeBid(roomId, uid, amount) {
  await waitForServerTime();

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "failed" };
  }

  let reason = "failed";

  const result = await runTransaction(roomRef(roomId), (room) => {
    reason = "failed";
    if (!room) return room;
    if (room.status !== ROOM_STATUS.PLAYING) return;
    if (room.auctionStatus !== "bidding") return;
    if (!room.auctionEndsAt || serverNow() >= room.auctionEndsAt) return;

    const players = { ...(room.players || {}) };
    const bidder = players[uid];
    if (!bidder) return;

    const currentBid = Number(room.currentBidPrice || 0);
    const previousId = room.currentHighBidder || "";

    if (previousId === uid) {
      reason = "already_leading";
      return;
    }

    const newBid = currentBid + amount;
    const bidderCoins = Number(bidder.coins || 0);
    if (bidderCoins < newBid) return;

    // Pehle leader ko refund
    if (previousId) {
      const previous = players[previousId];
      if (previous) {
        players[previousId] = {
          ...previous,
          coins: Number(previous.coins || 0) + currentBid,
        };
      }
    }

    players[uid] = { ...bidder, coins: bidderCoins - newBid };

    const now = serverNow();
    return {
      ...room,
      players,
      currentBidPrice: newBid,
      currentHighBidder: uid,
      auctionStartedAt: now,
      auctionEndsAt: now + AUCTION_DURATION_MS,
    };
  });

  if (!result.committed) return { ok: false, reason };

  return { ok: true, newBid: result.snapshot.val()?.currentBidPrice };
}

// 3) Timer khatam: item sold ya unsold
export async function settleAuction(roomId) {
   await waitForServerTime();
  await runTransaction(roomRef(roomId), (room) => {
    if (!room) return room;
    if (room.status !== ROOM_STATUS.PLAYING) return;
    if (room.auctionStatus !== "bidding") return;
    if (!room.auctionEndsAt || serverNow() < room.auctionEndsAt) return;

    const winnerId = room.currentHighBidder || "";
    const winningBid = Number(room.currentBidPrice || 0);
    const winner = room.players?.[winnerId];

    // Koi bid nahi ya winner nikal chuka: unsold
    if (!winnerId || winningBid <= 0 || !winner) {
      return {
        ...room,
        auctionStatus: "finished",
        resultType: "unsold",
        winnerId: "",
        winningBid: 0,
        actualValue: 0,
        profit: 0,
      };
    }

    const item = room.gameItems?.[room.currentItemIndex || 0];
    const actualValue = parseMoney(
      item?.value ?? item?.actualValue ?? item?.price,
    );

    // Bid pehle hi kat chuki hai, to item ki poori value wapas do
    const players = {
      ...room.players,
      [winnerId]: {
        ...winner,
        coins: Number(winner.coins || 0) + actualValue,
      },
    };

    return {
      ...room,
      players,
      auctionStatus: "finished",
      resultType: "sold",
      winnerId,
      winningBid,
      actualValue,
      profit: actualValue - winningBid,
    };
  });
}

// 4) Result ke baad agla item (ya game khatam)
export async function nextItem(roomId) {
  await runTransaction(roomRef(roomId), (room) => {
    if (!room) return room;
    if (room.status !== ROOM_STATUS.PLAYING) return;
    if (room.auctionStatus !== "finished") return;

    const nextIndex = (room.currentItemIndex || 0) + 1;

    if (nextIndex >= (room.gameItems || []).length) {
      return {
        ...room,
        status: ROOM_STATUS.COMPLETED,
        auctionStatus: "finished",
        auctionEndsAt: null,
        auctionStartedAt: null,
      };
    }

    return {
      ...room,
      currentItemIndex: nextIndex,
      currentRound: nextIndex + 1,
      currentBidPrice: 0,
      currentHighBidder: "",
      auctionStatus: "bidding",
      auctionEndsAt: null,
      auctionStartedAt: null,
      winnerId: "",
      winningBid: 0,
      actualValue: 0,
      profit: 0,
      resultType: "",
    };
  });
}
