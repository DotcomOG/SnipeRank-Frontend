export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // 🔁 MOCK: Simulate success (Mailgun temporarily disabled)
  console.log('📥 Full Report Request Received:', { name, email, phone });

  // TODO: Replace with real email logic later
  return res.status(200).json({ message: 'Report request received. Email logic is currently mocked.' });
}
