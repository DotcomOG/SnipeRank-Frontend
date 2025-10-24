/*
  api/full.js - v3.1.0 — Drop-in replacement
  Purpose: Produce comprehensive AI SEO JSON for /api/full or return a safe fallback.
  Notes:
  - Expects ENV: OPENAI_API_KEY (Render: SnipeRank-V2-dev)
  - Output keys: whatsWorking[10], needsAttention[25], engineInsights[5], score
*/

import OpenAI from "openai";
import cheerio from "cheerio";
import axios from "axios";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL parameter" });

  // quick sanity
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json(fallbackPayload(url, "no_api_key"));
  }

  try {
    // Fetch target HTML
    const resp = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SnipeRankBot/1.0)" },
      timeout: 15000
    });

    const $ = cheerio.load(resp.data);
    const textContent = $("body").text().replace(/\s+/g, " ").trim();
    const pageTitle = $("title").text().trim();
    const metaDescription = $('meta[name="description"]').attr("content")?.trim() || "";
    const headings = $("h1, h2, h3").map((i, el) => $(el).text().replace(/\s+/g, " ").trim()).get().join(" | ").slice(0, 2000);

    const contentPackage = [
      `URL: ${url}`,
      `Title: ${pageTitle}`,
      `Description: ${metaDescription}`,
      `Headings: ${headings}`,
      `Body (first 12k chars): ${textContent.slice(0, 12000)}`
    ].join("\n");

    const prompt = `
You are an expert AI SEO specialist focused on visibility in AI engines (ChatGPT, Claude, Gemini, Perplexity, Copilot).

Analyze the site content below for **AI visibility** (not generic SEO):

"""
${contentPackage}
"""

Return **ONLY JSON** with the exact keys:
- "whatsWorking": array of EXACTLY 10 items (2–4 sentences each, specific to this site)
- "needsAttention": array of EXACTLY 25 items. Each item must follow:
  "[PRIORITY: High|Medium|Low] Title: Problem for AI engines. Solution: 2–3 concrete steps. Impact: expected result."
- "engineInsights": array of EXACTLY 5 items (one each for ChatGPT, Claude, Gemini, Perplexity, Copilot) with actionable recommendations.

No prose outside JSON. No code fences. Keep language plain and client-facing. Ensure valid JSON.
`.trim();

    // OpenAI call
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.3,
      max_tokens: 3600,
      messages: [
        { role: "system", content: "You are a precise AI SEO analyst. Output must be valid JSON only." },
        { role: "user", content: prompt }
      ]
    });

    // Parse response (robust)
    const raw = completion?.choices?.[0]?.message?.content?.trim() || "";
    const jsonString = extractJSONObject(raw);
    if (!jsonString) {
      // Soft fallback to keep UI alive
      return res.status(200).json(fallbackPayload(url, "parse_missing_json", raw.slice(0, 600)));
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return res.status(200).json(fallbackPayload(url, "parse_invalid_json", raw.slice(0, 600)));
    }

    // Validate shape
    const ok =
      Array.isArray(parsed.whatsWorking) &&
      Array.isArray(parsed.needsAttention) &&
      Array.isArray(parsed.engineInsights);

    if (!ok) {
      return res.status(200).json(fallbackPayload(url, "invalid_shape", jsonString.slice(0, 600)));
    }

    // Compute score (bounded 20–100)
    const score = computeScore(parsed.whatsWorking, parsed.needsAttention);

    return res.status(200).json({
      success: true,
      score,
      whatsWorking: parsed.whatsWorking.slice(0, 10),
      needsAttention: parsed.needsAttention.slice(0, 25),
      engineInsights: parsed.engineInsights.slice(0, 5),
      meta: {
        analyzedAt: new Date().toISOString(),
        model: "gpt-4-turbo",
        analysisDepth: "premium",
        url
      }
    });

  } catch (error) {
    // Network / site access / OpenAI transport errors
    const code = error?.response?.status || error?.code || "unknown";
    // Always return a payload the UI can render
    return res.status(200).json(fallbackPayload(url, String(code)));
  }
}

/* ---------- helpers ---------- */

function extractJSONObject(text) {
  // If model returned fenced JSON, strip it
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();

  // Otherwise, grab the first top-level JSON object
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1).trim();
  }
  return "";
}

function computeScore(strengths, issues) {
  const base = 40;
  const bonus = Math.min((strengths?.length || 0) * 3, 30);
  const penalty = Math.min((issues?.length || 0) * 1.5, 30);
  const s = Math.max(20, Math.min(100, Math.round(base + bonus - penalty)));
  return s;
}

function fallbackPayload(url, reason = "fallback", snippet = "") {
  // Always valid JSON for UI; communicates reason via meta
  return {
    success: false,
    score: 50,
    whatsWorking: [
      "Your website is accessible and loads successfully for crawlers.",
      "HTTPS appears active, which is a baseline trust signal for AI engines."
    ],
    needsAttention: [
      "[PRIORITY: High] Structured Data Coverage: AI engines rely on schema to understand entities and services. Solution: Add Organization, WebSite, and relevant Service/Product schemas sitewide. Impact: Improves inclusion in AI summaries.",
      "[PRIORITY: Medium] Meta Description Gaps: Missing/weak descriptions reduce control over AI summaries. Solution: Author concise task-focused descriptions per page. Impact: Clearer answers in AI results.",
      "[PRIORITY: Medium] Image Alt Text Coverage: Low coverage limits AI understanding of visuals. Solution: Add descriptive alt attributes to key images. Impact: Better context for multimodal AI."
    ],
    engineInsights: [
      "ChatGPT: Benefits from explicit FAQs and task-oriented sections; add Q/A blocks for core intents.",
      "Claude: Prefers clear structure and citations; ensure headings reflect user tasks and include authoritative links.",
      "Gemini: Leans on entities; add schema and unambiguous entity mentions for brands, services, and locations.",
      "Perplexity: Surfaces sources; add referenceable pages (guides, docs) with clear titles and summaries.",
      "Copilot: Values concise, skimmable answers; add checklists and short how-to steps."
    ],
    meta: { url, mode: "lite-fallback", reason, snippet }
  };
}
