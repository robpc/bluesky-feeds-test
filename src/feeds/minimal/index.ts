import { FeedFetchFn, FeedInitFn, FeedMetadata } from "../types.js";

const metadata: FeedMetadata = {
  id: "minimal",
  displayName: "Minimal Feed",
  description: "The very least you need to host aa feed",
  avatar: "",
};

const init: FeedInitFn = () => {
  // Nothing to do
};

const feed: FeedFetchFn = async (limit: number, cursor?: string) => {
  return {
    cursor: "2023-04-13T12:58:29.511Z",
    feed: [
      {
        post: "at://did:plc:gkvpokm7ec5j5yxls6xk4e3z/app.bsky.feed.post/3jtax5zkchp2a",
      },
    ],
  };
};

export default {
  metadata,
  init,
  feed,
};
