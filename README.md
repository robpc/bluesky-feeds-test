# bluesky-feeds-test

Sample feed generator implementation based on the [official Bluesky example](https://github.com/bluesky-social/feed-generator)

When you run this server, it will create a `minimal` feed and the two other endpoints needed to host a feed. A good starting place would be the [./src/server.ts](./src/server.ts) file that serves those endpoints. See the [./src/feeds/](./src/feeds/) directory for more. There is also an option MVP firehose feed example that can be enabled (see instructions below).

## Setup

> NOTE: Important to use Node 18 or the publish script will not work

```bash
npm install
```

Create a `.env` file

```ini
BLUESKY_SERVER=wss://bsky.social
# REDIS_URL=redis:/127.0.0.1:6379

HOSTNAME=localhost
PORT=3000

PUBLISHER_DID=did:example:bob

# These can be only local envs
PUBLISHER_HANDLE=user.bsky.social
PUBLISHER_PASSWORD=abcd-1234-efgh-5678

# BACKFILL_FEEDS=true
```

### Optional for the "love" feed

- Run a redis server
- Uncomment and update the `.env` line for `REDIS_URL`
- Uncomment the [feeds](./src/feeds/index.ts) line with both the minimal and feeds line

## Run

```bash
npm run dev
```

Goto [http://localhost:3000](http://localhost:3000) and look at the listed links

## Publish Feeds

Deploy this server somewhere (like fly.io) and set the `HOSTNAME` env to match it's location and `PUBLISHER_DID`
to the account you want to place these feeds in.

Verify that the urls in the root page look good.

Locally update (no need to in "production") in the `PUBLISerH_HANDLE` and `PUBLISHer_PASSWORD` to an
App Credential for the destination account.

```bash
npm run publish-feeds
```
