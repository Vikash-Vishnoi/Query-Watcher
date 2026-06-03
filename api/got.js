const { getUrl, readBody, sendJson, sendText, setCors } = require("../lib/http");
const { saveEvent } = require("../lib/store");

function truncate(value, max = 300) {
  const text = String(value || "");
  return text.length <= max ? text : `${text.slice(0, max)}...[truncated]`;
}

async function readPayload(req) {
  const rawQuery = (req.url.split("?")[1] || "").split("#")[0];

  // Collect all params — no restrictions
  const params = rawQuery
    .split("&")
    .filter((p) => p !== "");

  if (params.length > 0) {
    // Decode each param individually and join as "key=value" lines
    const lines = params.map((p) => {
      const eqIdx = p.indexOf("=");
      if (eqIdx === -1) {
        try { return decodeURIComponent(p); } catch { return p; }
      }
      const key = p.slice(0, eqIdx);
      const val = p.slice(eqIdx + 1);
      try {
        return `${decodeURIComponent(key)}=${decodeURIComponent(val)}`;
      } catch {
        return p;
      }
    });
    return lines.join("\n");
  }

  if (req.method !== "POST") {
    return "";
  }

  const body = await readBody(req);
  if (!body) {
    return "";
  }

  const contentType = String(req.headers["content-type"] || "");
  if (contentType.includes("application/json")) {
    const json = JSON.parse(body);
    return json.d || json.data || json.payload || "";
  }

  return body;
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!["GET", "POST"].includes(req.method)) {
    sendText(res, 405, "Method not allowed.");
    return;
  }

  const url = getUrl(req);

  try {
    const incoming = await readPayload(req);

    const clientIp =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      (req.socket && req.socket.remoteAddress) ||
      "";

    const event = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
      ip: clientIp,
      method: req.method,
      payload: incoming,
      paramCount: incoming ? incoming.split("\n").filter(Boolean).length : 0,
      referer: truncate(req.headers.referer || ""),
      userAgent: truncate(req.headers["user-agent"] || "")
    };

    await saveEvent(event);
    sendJson(res, 200, { ok: true, id: event.id });
  } catch (error) {
    sendJson(res, 400, { ok: false, error: error.message || "Could not read payload." });
  }
};
