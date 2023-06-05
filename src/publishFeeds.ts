import dotenv from "dotenv";
import atPkg, { BlobRef } from "@atproto/api";
import fs from "fs/promises";

import config from "./config.js";
import feedsList from "./feeds/index.js";

const { AtpAgent } = atPkg;

const run = async () => {
  dotenv.config();

  // YOUR bluesky handle
  // Ex: user.bsky.social
  const handle = config.PUBLISHER_HANDLE;

  // YOUR bluesky password, or preferably an App Password (found in your client settings)
  // Ex: abcd-1234-efgh-5678
  const password = config.PUBLISHER_PASSWORD;

  if (!handle || !password) {
    console.error("Publish creds missing");
    return;
  }

  if (!config.SERVICE_DID && !config.HOSTNAME) {
    throw new Error("Please provide a hostname in the .env file");
  }
  const feedGenDid = config.SERVICE_DID;

  // only update this if in a test environment
  const agent = new AtpAgent({ service: "https://bsky.social" });
  await agent.login({ identifier: handle, password });

  try {
    await agent.api.app.bsky.feed.describeFeedGenerator();
  } catch (err) {
    throw new Error(
      "The bluesky server is not ready to accept published custom feeds yet"
    );
  }

  for (let feed of feedsList) {
    const { id, avatar, description, displayName } = feed.metadata;

    let avatarRef: BlobRef | undefined;
    if (avatar) {
      let encoding: string;
      if (avatar.endsWith("png")) {
        encoding = "image/png";
      } else if (avatar.endsWith("jpg") || avatar.endsWith("jpeg")) {
        encoding = "image/jpeg";
      } else {
        throw new Error("expected png or jpeg");
      }
      const img = await fs.readFile(avatar);
      const blobRes = await agent.api.com.atproto.repo.uploadBlob(img, {
        encoding,
      });
      avatarRef = blobRes.data.blob;
    }

    await agent.api.com.atproto.repo.putRecord({
      repo: agent.session?.did ?? "",
      collection: "app.bsky.feed.generator",
      rkey: id,
      record: {
        did: feedGenDid,
        displayName: displayName,
        description: description,
        avatar: avatarRef,
        createdAt: new Date().toISOString(),
      },
    });
  }

  console.log("All done 🎉");
};

run();
