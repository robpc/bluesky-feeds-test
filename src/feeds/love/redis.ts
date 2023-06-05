import { createClient } from "redis";
import config from "../../config.js";

const client = createClient({
  url: config.REDIS_URL,
  // pingInterval: 1000 * 60 * 4,
});

client.on("error", (err) => console.log("Redis Client [error]", err));
client.on("connect", () => console.log("Redis Client [connected]"));
client.on("reconnecting", () => console.log("Redis Client [reconnect]"));
client.on("ready", () => console.log("Redis Client is ready"));

await client.connect();

setInterval(async () => {
  try {
    await client.ping();
  } catch (err) {
    console.error("Ping Interval Error", err);
  }
}, 1000 * 60 * 4);

export default client;
