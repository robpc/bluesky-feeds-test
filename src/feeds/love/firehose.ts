import type { RepoRecord } from "@atproto/lexicon";
import { Subscription } from "@atproto/xrpc-server";
import pkg from "@atproto/api";
import { WriteOpAction, cborToLexRecord, readCarWithRoot } from "@atproto/repo";
import { Commit } from "@atproto/api/dist/client/types/com/atproto/sync/subscribeRepos.js";

import config from "../../config.js";
import client from "./redis.js";

const { AtUri } = pkg;

export type FirehoseWriteOp = {
  action: WriteOpAction.Create | WriteOpAction.Update;
  uri: string;
  cid: string;
  record: RepoRecord;
};

export type FirehoseDeleteOp = {
  action: WriteOpAction.Delete;
  uri: string;
};

export type FirehoseOp = FirehoseWriteOp | FirehoseDeleteOp;

type FirehoseOpListener = (op: FirehoseOp) => void;

var listeners: FirehoseOpListener[] = [];

export const addFirehoseListener = (fn: FirehoseOpListener) => {
  if (listeners.includes(fn)) return;
  listeners.push(fn);
};

const callListeners = (op: FirehoseOp) => {
  listeners.forEach((fn) => {
    try {
      fn(op);
    } catch (err) {
      console.error("firehose listener error:", err);
    }
  });
};

// -----

let processed_ops = 0;
let last_report = new Date();
const REPORT_INTERVAL = 15 * 60 * 1000;

// ---------------------------------------------------------
// DB Implementation, but could be something else
// ---------------------------------------------------------

const FIREHOSE_CURSOR_KEY = "firehose:cursor";
const setCursor = async (value: number) => {
  console.log("FIREHOSE SET cursor", value);
  await client.set(FIREHOSE_CURSOR_KEY, value);
};
const getCursor = async () => {
  const value = await client.get(FIREHOSE_CURSOR_KEY);
  const cursor = value ? parseInt(value) : -1;

  console.log(`FIREHOSE GET cursor ${cursor}`);

  return cursor;
};

// ---------------------------------------------------------

let last_seq = config.BACKFILL_FEEDS ? -1 : await getCursor();

const createConnection = async (service: string) => {
  const sub = new Subscription({
    service,
    method: "com.atproto.sync.subscribeRepos",
    validate: (body) => body,
    onReconnectError: (error: unknown, n: number, initialSetup: boolean) => {
      console.log(`firehose reconnect error:`, error, n, initialSetup);
    },
    getParams: () => ({ cursor: last_seq }),
  });

  for await (const frameBody of sub) {
    try {
      const { $type: frameBodyType } = frameBody as RepoRecord;
      switch (frameBodyType) {
        case "com.atproto.sync.subscribeRepos#commit":
          const commit = frameBody as Commit;
          const car = await readCarWithRoot(commit.blocks);

          const ops: FirehoseOp[] = [];

          commit.ops.forEach((op) => {
            // This section mostly minics the code in repo.getOps()
            const [collection, rkey] = op.path.split("/");
            if (
              op.action === WriteOpAction.Create ||
              op.action === WriteOpAction.Update
            ) {
              const cid = op.cid;
              const record = car.blocks.get(cid);
              ops.push({
                action:
                  op.action === WriteOpAction.Create
                    ? WriteOpAction.Create
                    : WriteOpAction.Update,
                cid: op.cid.toString(),
                record: cborToLexRecord(record),
                uri: AtUri.make(commit.repo, collection, rkey).toString(),
              });
            } else if (op.action === WriteOpAction.Delete) {
              ops.push({
                action: WriteOpAction.Delete,
                uri: AtUri.make(commit.repo, collection, rkey).toString(),
              });
            } else {
              console.log(`ERROR: Unknown repo op action: ${op.action}`);
            }
          });

          ops.forEach(callListeners);

          if (!last_seq || commit.seq - last_seq > 1000) {
            last_seq = commit.seq;
            await setCursor(commit.seq);
          }
          break;
        case "com.atproto.sync.subscribeRepos#handle":
          // const { did, handle } = frameBody as RepoRecord;
          // console.log(`New handle '@${handle}' (${did})`);
          break;
        case "com.atproto.sync.subscribeRepos#info":
          const { name, message } = frameBody as RepoRecord;
          console.log(`FIREHOSE MESSAGE [${name}] "${message}"`);
          break;
        default:
          console.log(
            `Unsupported frameBody $type '${frameBodyType}'`,
            frameBody
          );
      }

      processed_ops++;
      const now = new Date();
      if (now.getTime() - last_report.getTime() > REPORT_INTERVAL) {
        console.log(
          "FIREHOSE",
          processed_ops,
          "processed,",
          last_report.toLocaleString(),
          "to",
          now.toLocaleString()
        );
        processed_ops = 0;
        last_report = new Date();
      }
    } catch (err) {
      console.error("Unable to process frameBody", err, frameBody);
    }
  }
};

export const startFirehose = async (service: string) => {
  let lastRetry = 0;
  let numRetries = 0;
  // 1, 4, 9, 16, 25, 36, 49, 64 seconds
  const backoff = (n: number) => Math.min(n * n * 1000, 60 * 1000);
  while (true) {
    try {
      console.log(
        numRetries === 0
          ? "Start firehose processing"
          : `Restart firehose processing (${numRetries})`
      );
      await createConnection(service);
      if (lastRetry - Date.now() > 30 * 60 * 1000) {
        numRetries = 0;
      }
      lastRetry = Date.now();
    } catch (err) {
      console.log("firehose error:", err);
    }
    await new Promise((r) => setTimeout(r, backoff(numRetries++)));
  }
};
