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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SnipeRankBot/1.0)' }
    });
    const visibleText = extractVisibleText(htmlResponse.data);

    const prompt = `You are an expert in AI SEO analysis. Based on the following website content, return a valid JSON object with 3 sections:\n\nContent:\n"""${visibleText.slice(0, 7000)}"""\n\nReturn strictly valid JSON in this format:\n{\n  \"ai_superpowers\": [\n    { \"title\": \"...\", \"explanation\": \"...\" }\n  ],\n  \"ai_opportunities\": [\n    { \"title\": \"...\", \"explanation\": \"...\" }\n  ],\n  \"ai_engine_insights\": {\n    \"ChatGPT\": \"...\",\n    \"Claude\": \"...\",\n    \"Google Gemini\": \"...\",\n    \"Microsoft Copilot\": \"...\",\n    \"Perplexity\": \"...\"\n  }\n}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
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
