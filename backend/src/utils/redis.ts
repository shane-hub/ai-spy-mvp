import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL?.trim();
const redis = redisUrl
  ? new Redis(redisUrl, {
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    })
  : null;

if (redis) {
  redis.on("error", (error) =>
    console.error("Redis Client Error", error.message),
  );
  redis.on("connect", () => console.log("Redis Client Connected"));
} else {
  console.warn(
    "REDIS_URL is not configured; guest requests use an in-memory sandbox limiter.",
  );
}

export default redis;
