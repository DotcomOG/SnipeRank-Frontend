// 📄 api/friendly.js — Oye! let's see if this one fixes the call July 29

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

    const prompt = `You are an expert AI SEO consultant. Based on the website content below, return a strictly valid JSON report only — no explanations, no intro. Use this format:

Content:
"""${visibleText.slice(0, 7000)}"""

Output structure:
{
  "ai_superpowers": [
    { "title": "...", "explanation": "..." } // 5 items
  ],
  "ai_opportunities": [
    { "title": "...", "explanation": "..." } // 10 items
  ],
  "ai_engine_insights": {
    "ChatGPT": "...",
    "Claude": "...",
    "Google Gemini": "...",
    "Microsoft Copilot": "...",
    "Perplexity": "..."
  }
}

Important guidelines:
- Each explanation must be at least two full lines of text when viewed on a desktop screen.
- There is no maximum.
- Do not use bullets.
- Use natural, consultative tone.
- Vary sentence structure.
- Never begin every line the same way.`;

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
    });
    const visibleText = extractVisibleText(htmlResponse.data);

    const prompt = `You are an expert AI SEO consultant. Based on the website content below, return a strictly valid JSON report only — no explanations, no intro. Use this format:

Content:
"""${visibleText.slice(0, 7000)}"""

Output structure:
{
  "ai_superpowers": [
    { "title": "...", "explanation": "..." } // 5 items
  ],
  "ai_opportunities": [
    { "title": "...", "explanation": "..." } // 10 items
  ],
  "ai_engine_insights": {
    "ChatGPT": "...",
    "Claude": "...",
    "Google Gemini": "...",
    "Microsoft Copilot": "...",
    "Perplexity": "..."
  }
}

Important guidelines:
- Each explanation must be at least two full lines of text when viewed on a desktop screen.
- There is no maximum.
- Do not use bullets.
- Use natural, consultative tone.
- Vary sentence structure.
- Never begin every line the same way.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const raw = completion.choices[0]?.message?.content || '';
    const parsed = cleanResponse(raw);
    res.json({ raw, parsed });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: 'Analysis failed. Try again.' });
  }
});

export default router;
