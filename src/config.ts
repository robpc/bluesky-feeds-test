import * as dotenv from "dotenv";
dotenv.config();

const {
  BLUESKY_SERVER,
  REDIS_URL,
  HOSTNAME,
  PORT,
  SERVICE_DID,
  PUBLISHER_DID,
  PUBLISHER_HANDLE,
  PUBLISHER_PASSWORD,
  BACKFILL_FEEDS,
} = process.env;

export default {
  BLUESKY_SERVER,
  REDIS_URL,
  HOSTNAME,
  PORT,
  // Use a custom did or use the self validation at this hosts
  SERVICE_DID: SERVICE_DID ?? `did:web:${HOSTNAME}`,
  // This is the account where the feed will appear in the profile
  PUBLISHER_DID,
  PUBLISHER_HANDLE,
  PUBLISHER_PASSWORD,
  BACKFILL_FEEDS: BACKFILL_FEEDS
    ? BACKFILL_FEEDS.toLowerCase() === "true"
    : false,
};
