const KEY = "query-watcher:events";
const MAX_EVENTS = 50;

function redisReady() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

async function redisCommand(command) {
  const response = await fetch(process.env.UPSTASH_REDIS_REST_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    throw new Error(`Redis command failed: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data.result;
}

function memoryEvents() {
  if (!global.__QUERY_WATCHER_EVENTS) {
    global.__QUERY_WATCHER_EVENTS = [];
  }
  return global.__QUERY_WATCHER_EVENTS;
}

async function saveEvent(event) {
  if (redisReady()) {
    await redisCommand(["LPUSH", KEY, JSON.stringify(event)]);
    await redisCommand(["LTRIM", KEY, 0, MAX_EVENTS - 1]);
    return;
  }

  const events = memoryEvents();
  events.unshift(event);
  events.splice(MAX_EVENTS);
}

async function listEvents() {
  if (redisReady()) {
    const rows = await redisCommand(["LRANGE", KEY, 0, MAX_EVENTS - 1]);
    return rows.map((row) => {
      try {
        return JSON.parse(row);
      } catch {
        return null;
      }
    }).filter(Boolean);
  }

  return memoryEvents();
}

async function clearEvents() {
  if (redisReady()) {
    await redisCommand(["DEL", KEY]);
    return;
  }

  memoryEvents().splice(0);
}

module.exports = { clearEvents, listEvents, saveEvent };
