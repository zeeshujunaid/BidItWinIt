export const ROOM_NAMES = ["Room1", "Room2", "Room3", "Room4", "Room5"];
export const MAX_PLAYERS = 5;

export const BID_AMOUNTS = [100, 250, 500, 1000, 2000];
export const AUCTION_DURATION_MS = 15 * 1000;
export const NEXT_ITEM_DELAY_MS = 6000;
export const ITEMS_PER_GAME = 10;

export const ROOM_STATUS = {
  WAITING: "waiting",
  PREPARING: "preparing",
  PLAYING: "playing",
  COMPLETED: "completed",
};

export const RESET_KEYS = [
  "players",
  "presence",
  "gameItems",
  "currentItemIndex",
  "currentRound",
  "currentBidPrice",
  "currentHighBidder",
  "auctionStatus",
  "auctionEndsAt",
  "auctionStartedAt",
  "passedPlayers",
  "phaseEndsAt",
  "winnerId",
  "winningBid",
  "actualValue",
  "profit",
  "resultType",
  "completionReason",
  "activePlayerId",
];

export const parseMoney = (value) => {
  if (typeof value === "number") return value;
  const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getRandomItems = (items, count = ITEMS_PER_GAME) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};
