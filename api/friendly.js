// 📄 api/friendly.js — Fixed version July 29

import express from 'express';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function extractVisibleText(html) {
  const $ = cheerio.load(html);
  $('script, style, noscript').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

function isValidJson(str) {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

function cleanResponse(text) {
  const jsonStart = text.indexOf('{');
  const jsonEnd = text.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) return null;
  const jsonString = text.slice(jsonStart, jsonEnd + 1);
  return isValidJson(jsonString) ? JSON.parse(jsonString) : null;
}

router.get('/friendly', async (req, res) => {
  const url = req.query.url;
  if (!url || !/^https?:\/\//.test(url)) {
    return res.status(400).json({ error: 'Invalid or missing URL parameter' });
  }

  try {
    const htmlResponse = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SnipeRankBot/1.0)' },
      maxRedirects: 5,
      timeout: 10000
    });

    const visibleText = extractVisibleText(htmlResponse.data);

const prompt = `You are a world-class AI SEO consultant with deep expertise in how AI search engines analyze and rank content. Based on the website content below, return a strictly valid JSON report only — no explanations, no intro. Use this format:

Content:
"""${visibleText.slice(0, 7000)}"""

Output structure:
{
  "ai_superpowers": [
    { "title": "...", "explanation": "..." } // 10 items
  ],
  "ai_opportunities": [
    { "title": "...", "explanation": "..." } // 20 items
  ],
  "ai_engine_insights": {
    "ChatGPT": "...",
    "Claude": "...",
    "Google Gemini": "...",
    "Microsoft Copilot": "...",
    "Perplexity": "..."
  }
}

Critical requirements:
- Provide exactly 10 ai_superpowers and exactly 20 ai_opportunities
- Each explanation must be 3-5 full lines of rich, detailed analysis when viewed on a desktop screen
- The final sentence of each explanation must specify the exact measurable outcome or competitive advantage the client will gain when this optimization is implemented
- Use sophisticated, consultative language that demonstrates deep AI SEO expertise
- Vary sentence structure, opening phrases, and analytical approaches across all explanations
- Never repeat similar phrasing, concepts, or recommendation patterns
- Focus on actionable, specific insights rather than generic advice
- Reference current AI search behavior patterns and ranking factors
- Include technical depth while remaining accessible to business stakeholders
- Each title should be compelling and specific, avoiding generic phrases
- Prioritize insights that differentiate from traditional SEO approaches
- Address how each factor specifically impacts AI model understanding and content retrieval
- For engine insights, provide platform-specific optimization strategies that leverage each AI's unique characteristics`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const raw = completion.choices?.[0]?.message?.content;
    if (!raw) {
      console.error('❌ No content returned from OpenAI.');
      return res.status(502).json({ error: 'No content returned from OpenAI.' });
    }

    const parsed = cleanResponse(raw);
    if (!parsed) {
      console.error('❌ Failed to parse JSON from OpenAI:', raw);
      return res.status(500).json({ error: 'Invalid JSON format from OpenAI.', raw });
    }

    res.json({ raw, parsed });
  } catch (err) {
    console.error('❌ Analysis error:', err.message);
    res.status(500).json({ error: 'Analysis failed. Try again.', message: err.message });
  }
});

export default router;
