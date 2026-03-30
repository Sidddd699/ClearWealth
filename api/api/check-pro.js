const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 10;
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) { record.count = 1; record.resetAt = now + windowMs; }
  else record.count += 1;
  rateLimitMap.set(ip, record);
  return record.count > maxRequests;
}

function getIP(req) {
  return req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
    || req.headers["x-real-ip"]
    || req.socket?.remoteAddress
    || "unknown";
}

function setCORS(res, req) {
  const allowed = ["https://clear-wealth.vercel.app", "http://localhost:5173"];
  const origin = req.headers.origin;
  if (allowed.includes(origin)) res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCORS(res, req);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).end();

  if (isRateLimited(getIP(req)))
    return res.status(429).json({ isPro: false, error: "Too many requests" });

  const { email } = req.query;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return res.status(400).json({ isPro: false, error: "Invalid email" });

  try {
    const encoded = encodeURIComponent(email.toLowerCase().trim());
    const r = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/pro_users?email=eq.${encoded}&select=email,expires_at&limit=1`,
      { headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}` } }
    );
    if (!r.ok) return res.status(500).json({ isPro: false });
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return res.status(200).json({ isPro: false });
    const user = data[0];
    if (user.expires_at && new Date(user.expires_at) < new Date())
      return res.status(200).json({ isPro: false, expired: true });
    return res.status(200).json({ isPro: true });
  } catch (e) {
    console.error("check-pro:", e);
    return res.status(500).json({ isPro: false });
  }
}
