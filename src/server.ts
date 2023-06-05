import express, { Request } from "express";
import cors from "cors";

import config from "./config.js";
import feedsList from "./feeds/index.js";
import pkg from "@atproto/api";
const { AtUri } = pkg;

const app = express();
const port = config.PORT;

const feedsUris = feedsList.map(({ metadata }) =>
  AtUri.make(
    config.PUBLISHER_DID,
    "app.bsky.feed.generator",
    metadata.id
  ).toString()
);

app.use(cors());

app.get("/.well-known/did.json", (req, res) => {
  res.json({
    "@context": ["https://www.w3.org/ns/did/v1"],
    id: config.SERVICE_DID,
    service: [
      {
        id: "#bsky_fg",
        type: "BskyFeedGenerator",
        serviceEndpoint: `https://${config.HOSTNAME}`,
      },
    ],
  });
});

const query = (req: Request, name: string) => {
  const q = req.query[name];

  if (!q) return [];

  if (Array.isArray(q)) {
    return q.map<string>((i) => i.toString());
  }

  return [q.toString()];
};
app.get("/xrpc/app.bsky.feed.describeFeedGenerator", async (req, res) => {
  if (!config.SERVICE_DID.endsWith(config.HOSTNAME)) {
    return res
      .status(500)
      .json({ error: "This feed generator has an invalid Service DID" });
  }

  const feeds = feedsUris.map((uri) => ({ uri }));

  res.json({ did: config.SERVICE_DID, feeds });
});

app.get("/xrpc/app.bsky.feed.getFeedSkeleton", async (req, res) => {
  const atUri = query(req, "feed")[0];
  const limit = query(req, "limit")[0];
  const cursor = query(req, "cursor")[0];

  if (!atUri) {
    res.status(400).json({ error: "Missing param 'feed'" });
    return;
  }

  const [did, collection, key] = atUri.replace("at://", "").split("/");

  if (
    did !== config.PUBLISHER_DID ||
    collection !== "app.bsky.feed.generator"
  ) {
    res.status(400).json({ error: "Unsupported feed" });
    return;
  }

  const feed = feedsList.find((f) => f.metadata.id === key);

  if (feed) {
    res.json(await feed.feed(limit ? parseInt(limit) : 100, cursor));
  } else {
    res.status(404).json({ error: "Feed not found" });
  }
});

app.get("/", (req, res) => {
  const links = feedsUris.map(
    (uri) =>
      `<a href="/xrpc/app.bsky.feed.getFeedSkeleton?feed=${uri}">${uri}</a>`
  );

  res.send(
    "Bluesky Feed Generator" +
      "<br/><br/>" +
      `<a href="/.well-known/did.json">/.well-known/did.json</a>` +
      "<br/><br/>" +
      `<a href="/xrpc/app.bsky.feed.describeFeedGenerator">/xrpc/app.bsky.feed.describeFeedGenerator</a>` +
      "<br/><br/>" +
      links.join("<br/>")
  );
});

export const createServer = () => {
  app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
  });
};
