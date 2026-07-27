import Redis from "ioredis";

export interface CacheClient {
  get(key: string): Promise<string | null>;
  set(
    key: string,
    value: string,
    mode?: "EX",
    durationSeconds?: number,
  ): Promise<string>;
  del(key: string): Promise<number>;
  ttl(key: string): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, durationSeconds: number): Promise<number>;
}

type MemoryValue = {
  value: string;
  expiresAt: number | null;
};

const redisUrl = process.env.REDIS_URL?.trim();
const memoryStore = new Map<string, MemoryValue>();
const MAX_MEMORY_KEYS = 10_000;

function pruneMemoryStore(now = Date.now()) {
  for (const [key, item] of memoryStore) {
    if (item.expiresAt !== null && item.expiresAt <= now) {
      memoryStore.delete(key);
    }
  }
  while (memoryStore.size > MAX_MEMORY_KEYS) {
    const oldestKey = memoryStore.keys().next().value;
    if (typeof oldestKey !== "string") break;
    memoryStore.delete(oldestKey);
  }
}

const memoryClient: CacheClient = {
  async get(key) {
    const item = memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt !== null && item.expiresAt <= Date.now()) {
      memoryStore.delete(key);
      return null;
    }
    return item.value;
  },

  async set(key, value, mode, durationSeconds) {
    const expiresAt =
      mode === "EX" && typeof durationSeconds === "number"
        ? Date.now() + durationSeconds * 1000
        : null;
    memoryStore.delete(key);
    memoryStore.set(key, { value, expiresAt });
    pruneMemoryStore();
    return "OK";
  },

  async del(key) {
    return memoryStore.delete(key) ? 1 : 0;
  },

  async ttl(key) {
    const item = memoryStore.get(key);
    if (!item) return -2;
    if (item.expiresAt === null) return -1;
    const remaining = Math.ceil((item.expiresAt - Date.now()) / 1000);
    if (remaining <= 0) {
      memoryStore.delete(key);
      return -2;
    }
    return remaining;
  },

  async incr(key) {
    const item = memoryStore.get(key);
    const currentValue = await memoryClient.get(key);
    const current = Number.parseInt(currentValue ?? "0", 10);
    if (!Number.isFinite(current)) {
      throw new Error("Value is not an integer");
    }
    const next = current + 1;
    memoryStore.set(key, {
      value: next.toString(),
      expiresAt: item?.expiresAt ?? null,
    });
    pruneMemoryStore();
    return next;
  },

  async expire(key, durationSeconds) {
    const item = memoryStore.get(key);
    if (!item || (item.expiresAt !== null && item.expiresAt <= Date.now())) {
      memoryStore.delete(key);
      return 0;
    }
    item.expiresAt = Date.now() + durationSeconds * 1000;
    return 1;
  },
};

let redis: CacheClient;

if (redisUrl) {
  const client = new Redis(redisUrl, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  client.on("error", (error) =>
    console.error("Redis Client Error", error.message),
  );
  client.on("connect", () => console.log("Redis Client Connected"));

  redis = {
    get: (key) => client.get(key),
    set: (key, value, mode, durationSeconds) =>
      mode === "EX" && typeof durationSeconds === "number"
        ? client.set(key, value, mode, durationSeconds)
        : client.set(key, value),
    del: (key) => client.del(key),
    ttl: (key) => client.ttl(key),
    incr: (key) => client.incr(key),
    expire: (key, durationSeconds) => client.expire(key, durationSeconds),
  };
} else {
  console.warn(
    "REDIS_URL is not configured; using the bounded in-memory sandbox cache.",
  );
  redis = memoryClient;
}

export default redis;
