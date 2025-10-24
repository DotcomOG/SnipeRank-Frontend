/*
  server.js - v2.3.0 - October 24, 2025
  
  CHANGELOG:
  - Added missing /api/friendly route for short reports (5/10 format)
  - Added missing /api/full route for comprehensive reports (connects to full.js)
  - Maintained existing working functionality for /report.html and /api/send-link
  - Added calculateScore function for API responses
  - Enhanced error handling for API endpoints
  
  ROUTES:
  - GET / : Health check
  - GET /report.html : HTML report format
  - GET /api/friendly : JSON short report (5 strengths, 10 opportunities)  
  - GET /api/full : JSON full report (uses OpenAI via full.js)
  - POST /api/send-link : Form submission handler
  
  DEPENDENCIES:
  - Express, CORS, Axios, Cheerio
  - OpenAI API key for /api/full endpoint
  - full.js file in /api directory
*/

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import sendLinkHandler from './api/send-link.js';
// Import the OpenAI handler
import fullReportHandler from './api/full.js';

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

// Function to analyze website (existing)
async function analyzeWebsite(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'SnipeRank SEO Analyzer Bot'
      }
    });
    
    const $ = cheerio.load(response.data);
    const analysis = {
      working: [],
      needsAttention: [],
      insights: []
    };

    // Check HTTPS
    if (url.startsWith('https://')) {
      analysis.working.push({
        title: 'SSL Security Implementation',
        description: 'Your site uses HTTPS encryption, which builds trust with AI crawlers and search algorithms. This security foundation is essential for modern web credibility and ranking factors.'
      });
    } else {
      analysis.needsAttention.push({
        title: 'SSL Certificate Missing',
        description: 'Your site lacks HTTPS encryption, which is now a baseline requirement for AI systems and search engines. This security gap significantly impacts trustworthiness and ranking potential.'
      });
    }

    // Check meta title
    const title = $('title').text();
    if (title && title.length > 0) {
      if (title.length <= 60) {
        analysis.working.push({
          title: 'Meta Title Optimization',
          description: `Your page title "${title.substring(0, 40)}..." is properly sized and contains clear branding. This helps AI systems quickly understand your page focus and purpose.`
        });
      } else {
        analysis.needsAttention.push({
          title: 'Meta Title Length Issues',
          description: 'Your page titles exceed recommended character limits, potentially causing truncation in search results and reducing AI comprehension of your key messaging.'
        });
      }
    } else {
      analysis.needsAttention.push({
        title: 'Missing Page Titles',
        description: 'Critical pages lack proper title tags, preventing AI systems from understanding page content and significantly reducing search visibility potential.'
      });
    }

    // Check meta description
    const metaDesc = $('meta[name="description"]').attr('content');
    if (metaDesc && metaDesc.length > 0) {
      analysis.working.push({
        title: 'Meta Description Present',
        description: 'Your pages include meta descriptions that help AI systems understand content context. This provides better control over how your content appears in search results.'
      });
    } else {
      analysis.needsAttention.push({
        title: 'Meta Description Gaps',
        description: 'Missing meta descriptions reduce your ability to control how AI systems summarize your content, leading to potentially less compelling search result presentations.'
      });
    }

    // Check headings structure
    const h1Count = $('h1').length;
    if (h1Count === 1) {
      analysis.working.push({
        title: 'Proper Heading Structure',
        description: 'Your page uses a single H1 tag with clear hierarchy, helping AI systems understand content organization and topic priorities effectively.'
      });
    } else if (h1Count === 0) {
      analysis.needsAttention.push({
        title: 'Missing H1 Structure',
        description: 'Pages lack proper H1 headings, making it difficult for AI systems to identify main topics and content hierarchy, reducing topical authority signals.'
      });
    } else {
      analysis.needsAttention.push({
        title: 'Multiple H1 Tags Detected',
        description: 'Multiple H1 tags create content hierarchy confusion for AI parsers, potentially diluting topic focus and reducing content authority signals.'
      });
    }

    // Check images and alt text
    const images = $('img');
    const imagesWithAlt = $('img[alt]');
    const altTextCoverage = images.length > 0 ? (imagesWithAlt.length / images.length) * 100 : 100;
    
    if (altTextCoverage >= 80) {
      analysis.working.push({
        title: 'Image Optimization',
        description: `${Math.round(altTextCoverage)}% of your images include descriptive alt text, helping AI systems understand visual content and improving accessibility for search algorithms.`
      });
    } else {
      analysis.needsAttention.push({
        title: 'Image Alt Text Gaps',
        description: `Only ${Math.round(altTextCoverage)}% of images have descriptive alt text, missing opportunities for AI systems to understand visual content and index multimedia elements.`
      });
    }

    // Check for schema markup
    const hasSchema = $('script[type="application/ld+json"]').length > 0 || 
                     $('[itemscope]').length > 0;
    
    if (hasSchema) {
      analysis.working.push({
        title: 'Structured Data Implementation',
        description: 'Your site includes schema markup that helps AI engines understand your business type, services, and key information, improving visibility in AI-powered search results.'
      });
    } else {
      analysis.needsAttention.push({
        title: 'Schema Markup Missing',
        description: 'Your site lacks structured data that helps AI engines understand your business type, services, and key information. This is becoming increasingly critical for AI visibility.'
      });
    }

    // Fill remaining spots with generic analysis
    while (analysis.working.length < 5) {
      const genericWorking = [
        { title: 'Mobile-Responsive Design', description: 'Your website adapts well to different screen sizes and devices. AI systems increasingly prioritize mobile-first indexing, making this a critical competitive advantage.' },
        { title: 'Content Structure Recognition', description: 'Your pages use semantic HTML elements that help AI understand content hierarchy. Clear headings and paragraph structures make your content easily parseable by machine learning algorithms.' },
        { title: 'Loading Speed Baseline', description: 'Your core web vitals fall within acceptable ranges for most pages. Fast-loading sites receive preference from both users and AI ranking systems that evaluate user experience signals.' }
      ];
      
      if (analysis.working.length < 5) {
        analysis.working.push(genericWorking[analysis.working.length - 2] || genericWorking[0]);
      }
    }

    while (analysis.needsAttention.length < 10) {
      const genericIssues = [
        { title: 'Internal Linking Strategy', description: 'Your pages don\'t effectively cross-reference related content, missing opportunities to guide AI crawlers through your most important information.' },
        { title: 'Content Depth Analysis', description: 'Some key pages lack the comprehensive content depth that AI systems now expect for authoritative rankings in competitive topics.' },
        { title: 'Site Architecture Issues', description: 'Your URL structure and navigation hierarchy could be optimized to better guide AI crawlers to your most valuable content.' },
        { title: 'Local SEO Signals', description: 'Missing or incomplete local business information prevents AI systems from understanding your geographic relevance and service areas.' },
        { title: 'Content Freshness Gaps', description: 'Limited recent content updates may signal to AI algorithms that your site lacks current, relevant information in your industry.' },
        { title: 'Core Web Vitals Optimization', description: 'While acceptable, your page speed and user experience metrics have room for improvement that could significantly impact AI rankings.' },
        { title: 'Competitive Content Gaps', description: 'Analysis shows opportunities where competitors are capturing AI attention with content topics and formats you\'re not currently addressing.' }
      ];
      
      const issueIndex = analysis.needsAttention.length - 3;
      if (issueIndex >= 0 && issueIndex < genericIssues.length) {
        analysis.needsAttention.push(genericIssues[issueIndex]);
      } else {
        analysis.needsAttention.push(genericIssues[0]);
      }
    }

    // Add AI insights
    const domain = new URL(url).hostname;
    analysis.insights = [
      { description: `ChatGPT Perspective: When asked about businesses like ${domain}, ChatGPT can identify your industry but struggles to articulate your unique value proposition or specific expertise areas.` },
      { description: `Google Bard Analysis: Bard recognizes your brand presence but often defaults to generic industry information rather than highlighting your distinctive services or competitive advantages.` },
      { description: `Perplexity Assessment: This AI search engine finds your content but tends to cite competitors more frequently when answering questions in your subject matter expertise.` }
    ];

    return analysis;

  } catch (error) {
    console.error('Analysis error:', error.message);
    // Return fallback analysis
    return {
      working: [
        { title: 'Basic Web Presence', description: 'Your website is accessible and loads properly, providing a foundation for AI analysis and indexing.' }
      ],
      needsAttention: [
        { title: 'Analysis Connection Issue', description: 'Technical limitations prevented complete analysis. A manual review would provide more comprehensive insights into your AI SEO opportunities.' },
        { title: 'Schema Markup Missing', description: 'Your site likely lacks structured data that helps AI engines understand your business type and services.' }
      ],
      insights: [
        { description: 'Complete AI analysis requires deeper technical access to provide accurate insights about your search visibility.' }
      ]
    };
  }
}

// Calculate score function
function calculateScore(analysis) {
  let score = 5;
  score += Math.min(analysis.working.length * 0.5, 2.5);
  score -= Math.min(analysis.needsAttention.length * 0.3, 3);
  return Math.max(0, Math.min(10, Math.round(score)));
}

// MISSING ROUTE #1: /api/friendly (for short reports)
app.get('/api/friendly', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ 
      error: 'Missing URL parameter',
      message: 'Please provide a url query parameter'
    });
  }
  
  try {
    new URL(targetUrl);
  } catch (err) {
    return res.status(400).json({ 
      error: 'Invalid URL format',
      message: 'Please provide a valid URL (e.g., https://example.com)'
    });
  }

  try {
    const analysis = await analyzeWebsite(targetUrl);
    const score = calculateScore(analysis);
    
    const response = {
      score: score,
      powers: analysis.working.map(item => `${item.title}: ${item.description}`),
      opportunities: analysis.needsAttention.map(item => `${item.title}: ${item.description}`),
      insights: analysis.insights.map(item => item.description),
      meta: {
        analyzedAt: new Date().toISOString(),
        model: 'SnipeRank v2.0',
        url: targetUrl
      }
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ 
      error: 'Analysis failed',
      message: 'Unable to analyze the website. Please try again later.'
    });
  }
});

// MISSING ROUTE #2: /api/full (for comprehensive reports using OpenAI)
app.get('/api/full', (req, res) => {
  // Use the imported fullReportHandler
  fullReportHandler(req, res);
});

// SEO report endpoint (existing)
app.get('/report.html', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).send('<p style="color:red">Missing URL parameter.</p>');
  }
  
  try {
    new URL(targetUrl);
  } catch (err) {
    return res.status(400).send('<p style="color:red">Invalid URL format.</p>');
  }

  const analysis = await analyzeWebsite(targetUrl);
  
  let workingHtml = '';
  analysis.working.forEach(item => {
    workingHtml += `<li><strong>${item.title}:</strong> ${item.description}</li>`;
  });

  let needsAttentionHtml = '';
  analysis.needsAttention.forEach(item => {
    needsAttentionHtml += `<li><strong>${item.title}:</strong> ${item.description}</li>`;
  });

  let insightsHtml = '';
  analysis.insights.forEach(item => {
    insightsHtml += `<li>${item.description}</li>`;
  });

  const html = `
    <div class="section-title">✅ What's Working</div>
    <ul>${workingHtml}</ul>
    
    <div class="section-title">🚨 Needs Attention</div>
    <ul>${needsAttentionHtml}</ul>
    
    <div class="section-title">📡 AI Engine Insights</div>
    <ul>${insightsHtml}</ul>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// Register the form submission route (existing)
app.post('/api/send-link', sendLinkHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API endpoints available:`);
  console.log(`- /api/friendly (short reports)`);
  console.log(`- /api/full (comprehensive reports)`);
});
