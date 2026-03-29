import { createHmac } from "crypto";

// Disable automatic body parsing so we get raw body for signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function saveProUser(email, paymentId, amount) {
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/pro_users`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        payment_id: paymentId,
        amount_paise: amount,
      }),
    }
  );
  return res.ok;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const rawBody = await getRawBody(req);
  const signature = req.headers["x-razorpay-signature"];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify webhook signature
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (signature !== expected) {
    console.error("Invalid Razorpay webhook signature");
    return res.status(400).json({ error: "Invalid signature" });
  }

  const event = JSON.parse(rawBody);
  console.log("Razorpay event:", event.event);

  // Handle both payment captured and payment link paid events
  if (
    event.event === "payment.captured" ||
    event.event === "payment_link.paid"
  ) {
    const payment = event.payload?.payment?.entity;
    const email = payment?.email;
    const paymentId = payment?.id;
    const amount = payment?.amount;

    if (!email) {
      console.error("No email in payment payload");
      return res.status(200).json({ status: "ok", note: "no email" });
    }

    const saved = await saveProUser(email, paymentId, amount);
    console.log(`Pro user saved: ${email} — ${saved ? "success" : "failed"}`);
  }

  return res.status(200).json({ status: "ok" });
}
