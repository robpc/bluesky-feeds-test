import feeds from "./feeds/index.js";
import { createServer } from "./server.js";

feeds.forEach((feed) => feed.init());

createServer();
