import { WriteOpAction } from "@atproto/repo";
import client from "./redis.js";

import { addFirehoseListener, startFirehose } from "./firehose.js";
import config from "../../config.js";

const metadata = {
  id: "love",
  displayName: "All you need is love",
  description: "Every post with the word 'love' in it",
  avatar: "./assets/feed.png",
};

// ---------------------------------------------------------
// DB Implementation, but could be something else
// ---------------------------------------------------------

const FEED_POST_TEXT = ["love"];
const REDIS_FEED_KEY = `feed:${metadata.id}`;

const addToFeed = (uri: string, date: string) => {
  console.log(`${metadata.id} ADD`, uri);
  client.zAdd(REDIS_FEED_KEY, {
    score: new Date(date).getTime(),
    value: uri,
  });
};

const removeFromFeed = (uri: string) => {
  client
    .zRem(REDIS_FEED_KEY, uri)
    .then((n) => n && console.log(`${metadata.id} DEL`, uri, n));
};

const removeFromFeedByDate = async (expire: Date) => {
  const num = await client.zRemRangeByScore(
    REDIS_FEED_KEY,
    0,
    expire.getTime()
  );
  console.log(`${metadata.id} EXPIRE`, num);
};

const getFromFeed = async (limit: number, cursor?: string) => {
  if (cursor) {
    return await client.zRange(REDIS_FEED_KEY, cursor, -1, {
      BY: "SCORE",
      REV: true,
      LIMIT: { offset: 1, count: limit },
    });
  } else {
    return await client.zRange(REDIS_FEED_KEY, 0, limit - 1, { REV: true });
  }
};

const getFeedPosition = (uri: string) => {
  return client.zScore(REDIS_FEED_KEY, uri);
};

// ---------------------------------------------------------

const init = () => {
  addFirehoseListener((op) => {
    if (op.action === WriteOpAction.Delete) {
      const { uri } = op;
      if (uri.includes("app.bsky.feed.post")) {
        removeFromFeed(uri);
      }
      return;
    }

    if (op.record["$type"] !== "app.bsky.feed.post") {
      return;
    }

    const { uri } = op;
    const createdAt = op.record["createdAt"];

    // Very simple language analysis, a real keyword search might have more here
    const words = (op.record["text"] as string).toLowerCase().split(" ");

    const hasFeedText = FEED_POST_TEXT.some((filter) => words.includes(filter));

    if (hasFeedText) {
      addToFeed(uri, createdAt);
    }
  });

  let timeout;
  const expireFeed = async () => {
    const expire = new Date();
    expire.setDate(expire.getDate() - 2);
    await removeFromFeedByDate(expire);
    timeout = setTimeout(expireFeed, 60 * 60 * 1000);
  };
  expireFeed();

  // If this really had a lot of feeds with data from the firehose
  // start this somewhere else, like in the main script after setup
  startFirehose(config.BLUESKY_SERVER);
};

const feed = async (limit: number, from?: string) => {
  let uris = await getFromFeed(limit, from);

  let cursor = undefined;
  if (uris.length > 0) {
    const score = await getFeedPosition(uris[uris.length - 1]);
    cursor = "" + score;
  }

  const feed = uris.map((post) => ({ post }));
  return { cursor, feed };
};

export default {
  metadata,
  init,
  feed,
};
