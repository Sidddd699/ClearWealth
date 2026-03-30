import { createHmac } from "crypto";

export const config = { api: { bodyParser: false } };

function setCORS(res) {
  // Webhook only accepts POST from Razorpay servers — no CORS needed
  res.setHeader("X-Content-Type-Options", "nosniff");
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function saveProUser(email, paymentId, amount) {
  const r = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/pro_users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        payment_id: paymentId,
        amount_paise: amount,
      }),
    }
  );
  return r.ok;
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-razorpay-signature"];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not set");
    return res.status(500).end();
  }

  // Verify signature — rejects any fake/forged webhook
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (!signature || signature !== expected) {
    console.error("Invalid webhook signature — possible forgery attempt");
    return res.status(400).json({ error: "Invalid signature" });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: "Invalid JSON" });
  }

  console.log("Razorpay webhook received:", event.event);

  const handled = ["payment.captured", "payment_link.paid"];
  if (!handled.includes(event.event)) {
    return res.status(200).json({ status: "ignored" });
  }

  const payment = event.payload?.payment?.entity;
  const email = payment?.email;
  const paymentId = payment?.id;
  const amount = payment?.amount;

  if (!email || !paymentId) {
    console.error("Missing email or payment ID in payload");
    return res.status(200).json({ status: "ok", note: "missing data" });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Invalid email in payload:", email);
    return res.status(200).json({ status: "ok", note: "invalid email" });
  }

  const saved = await saveProUser(email, paymentId, amount);
  console.log(`Pro user ${saved ? "saved" : "FAILED"}: ${email}`);

  return res.status(200).json({ status: "ok" });
}
