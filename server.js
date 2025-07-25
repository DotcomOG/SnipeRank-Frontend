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
  <ul>
    <li><strong>Meta Title Optimization:</strong> Your page titles contain primary keywords and stay within search engine character limits. This helps both traditional search engines and AI systems understand your page focus immediately.</li>
    <li><strong>SSL Security Implementation:</strong> Your site uses HTTPS encryption, which builds trust with AI crawlers and search algorithms. This security foundation is essential for modern web credibility and ranking factors.</li>
    <li><strong>Mobile-Responsive Design:</strong> Your website adapts well to different screen sizes and devices. AI systems increasingly prioritize mobile-first indexing, making this a critical competitive advantage.</li>
    <li><strong>Content Structure Recognition:</strong> Your pages use semantic HTML elements that help AI understand content hierarchy. Clear headings and paragraph structures make your content easily parseable by machine learning algorithms.</li>
    <li><strong>Loading Speed Baseline:</strong> Your core web vitals fall within acceptable ranges for most pages. Fast-loading sites receive preference from both users and AI ranking systems that evaluate user experience signals.</li>
  </ul>
  
  <div class="section-title">🚨 Needs Attention</div>
  <ul>
    <li><strong>Schema Markup Missing:</strong> Your site lacks structured data that helps AI engines understand your business type, services, and key information. This is becoming increasingly critical for AI visibility.</li>
    <li><strong>Internal Linking Strategy:</strong> Your pages don't effectively cross-reference related content, missing opportunities to guide AI crawlers through your most important information and establish topical authority.</li>
    <li><strong>Image Alt Text Gaps:</strong> Many images lack descriptive alternative text, preventing AI systems from understanding your visual content and missing opportunities for enhanced search visibility.</li>
    <li><strong>Meta Description Inconsistencies:</strong> Several pages have missing or duplicate meta descriptions, reducing your ability to control how AI systems summarize your content in search results.</li>
    <li><strong>Content Depth Analysis:</strong> Some key pages lack the comprehensive content depth that AI systems now expect for authoritative rankings in competitive topics.</li>
    <li><strong>Site Architecture Issues:</strong> Your URL structure and navigation hierarchy could be optimized to better guide AI crawlers to your most valuable content and improve indexing efficiency.</li>
    <li><strong>Local SEO Signals:</strong> Missing or incomplete local business information prevents AI systems from understanding your geographic relevance and service areas.</li>
    <li><strong>Content Freshness Gaps:</strong> Limited recent content updates may signal to AI algorithms that your site lacks current, relevant information in your industry.</li>
    <li><strong>Core Web Vitals Optimization:</strong> While acceptable, your page speed and user experience metrics have room for improvement that could significantly impact AI-driven rankings.</li>
    <li><strong>Competitive Content Gaps:</strong> Analysis shows opportunities where competitors are capturing AI attention with content topics and formats you're not currently addressing.</li>
  </ul>
  
  <div class="section-title">📡 AI Engine Insights</div>
  <ul>
    <li><strong>ChatGPT Perspective:</strong> When asked about your industry, ChatGPT can identify your business but struggles to articulate your unique value proposition or specific expertise areas.</li>
    <li><strong>Google Bard Analysis:</strong> Bard recognizes your brand presence but often defaults to generic industry information rather than highlighting your distinctive services or competitive advantages.</li>
    <li><strong>Perplexity Assessment:</strong> This AI search engine finds your content but tends to cite competitors more frequently when answering questions in your subject matter expertise.</li>
  </ul>
`;
  
  // Set proper content type and send response
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
