const { getUrl, sendJson, setCors } = require("../lib/http");
const { clearEvents, listEvents } = require("../lib/store");

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = getUrl(req);

  if (req.method === "DELETE" || url.searchParams.get("clear") === "1") {
    await clearEvents();
    sendJson(res, 200, { ok: true, events: [] });
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  try {
    sendJson(res, 200, { ok: true, events: await listEvents() });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || "Could not load events." });
  }
};
