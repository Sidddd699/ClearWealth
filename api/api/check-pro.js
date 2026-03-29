export default async function handler(req, res) {
  // Allow CORS for the app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  if (req.method !== "GET") return res.status(405).end();

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const encodedEmail = encodeURIComponent(email.toLowerCase().trim());
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/pro_users?email=eq.${encodedEmail}&select=email&limit=1`,
      {
        headers: {
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );

    const data = await response.json();
    const isPro = Array.isArray(data) && data.length > 0;

    return res.status(200).json({ isPro });
  } catch (err) {
    console.error("check-pro error:", err);
    return res.status(500).json({ error: "Server error", isPro: false });
  }
}
