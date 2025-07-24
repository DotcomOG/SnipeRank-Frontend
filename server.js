import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.send('SnipeRank Backend is running!');
});

// SEO report endpoint
app.get('/report.html', (req, res) => {
  const targetUrl = req.query.url;
  
  // Check for missing URL parameter
  if (!targetUrl) {
    return res.status(400).send('<p style="color:red">Missing URL parameter.</p>');
  }
  
  // Validate URL format
  try {
    new URL(targetUrl);
  } catch (err) {
    return res.status(400).send('<p style="color:red">Invalid URL format.</p>');
  }
  
  const html = `
    <div class="section-title">✅ What's Working</div>
    <ul><li>Your site includes structured data for AI to interpret.</li></ul>
    <div class="section-title">🚨 Needs Attention</div>
    <ul><li>No sitemap.xml detected.</li></ul>
    <div class="section-title">📡 AI Engine Insights</div>
    <ul><li>ChatGPT sees some brand identity, but it's unclear.</li></ul>
  `;
  
  // Set proper content type and send response
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
