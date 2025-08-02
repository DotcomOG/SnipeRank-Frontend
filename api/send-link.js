export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, phone, company, message, url } = req.body;

  if (!name || !email || !url) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Log the submitted payload
  console.log("📩 Full Report Request Received:");
  console.log({ name, email, phone, company, message, url });

  // Simulate a successful submission
  return res.status(200).json({ success: true });
}
