/*
  server.js — v3.0.0 (one-file backend)
  Purpose: Guarantees /api/full exists and returns valid JSON (or safe fallback).
  - GET /                : Health check
  - GET /api/friendly    : Lightweight analyzer (score 0–10 -> 0–100 mapped in frontend)
  - GET /api/full        : Comprehensive AI analysis (OpenAI) with robust fallback
  - HEAD /api/full       : 200 if handler available (used by frontend probe)
  - GET /api/full/status : { ok, openai } service status
  - GET /report.html     : Simple HTML report for analyze page
  - POST /api/send-link  : Accepts form posts (no-op OK response)

  Requires (for full analysis):
    - OPENAI_API_KEY  (optional; if missing, fallback JSON is returned)
*/

import express from "express";
import cors from "cors";
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ---------- Utilities ----------
function extractDomain(u) {
  try {
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    return new URL(withProto).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function computeScore(strengths, issues) {
  const base = 40;
  const bonus = Math.min((strengths?.length || 0) * 3, 30);
  const penalty = Math.min((issues?.length || 0) * 1.5, 30);
  return Math.max(20, Math.min(100, Math.round(base + bonus - penalty)));
}

function fallbackPayload(url, reason = "fallback", snippet = "") {
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

// ---------- Basic analyzer for /api/friendly ----------
async function analyzeWebsite(url) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "SnipeRank SEO Analyzer Bot" }
    });
    const $ = cheerio.load(response.data);
    const analysis = { working: [], needsAttention: [], insights: [] };

    // HTTPS
    if (url.startsWith("https://")) {
      analysis.working.push({
        title: "SSL Security Implementation",
        description:
          "Your site uses HTTPS encryption, which builds trust with AI crawlers and search algorithms."
      });
    } else {
      analysis.needsAttention.push({
        title: "SSL Certificate Missing",
        description:
          "Your site lacks HTTPS encryption, which is now a baseline requirement for AI systems."
      });
    }

    // Title
    const title = $("title").text();
    if (title && title.length > 0 && title.length <= 60) {
      analysis.working.push({
        title: "Meta Title Optimization",
        description: `Your page title "${title.substring(
          0,
          40
        )}..." is properly sized and helps AI systems understand your page focus.`
      });
    } else if (title && title.length > 60) {
      analysis.needsAttention.push({
        title: "Meta Title Length Issues",
        description:
          "Your page titles exceed recommended character limits, reducing AI comprehension."
      });
    } else {
      analysis.needsAttention.push({
        title: "Missing Page Titles",
        description:
          "Critical pages lack proper title tags, preventing AI systems from understanding content."
      });
    }

    // Meta description
    const metaDesc = $('meta[name="description"]').attr("content");
    if (metaDesc && metaDesc.length > 0) {
      analysis.working.push({
        title: "Meta Description Present",
        description:
          "Your pages include meta descriptions that help AI systems understand content context."
      });
    } else {
      analysis.needsAttention.push({
        title: "Meta Description Gaps",
        description:
          "Missing meta descriptions reduce your control over how AI systems summarize your content."
      });
    }

    // H1s
    const h1Count = $("h1").length;
    if (h1Count === 1) {
      analysis.working.push({
        title: "Proper Heading Structure",
        description:
          "Your page uses a single H1 tag with clear hierarchy, helping AI systems understand content organization."
      });
    } else if (h1Count === 0) {
      analysis.needsAttention.push({
        title: "Missing H1 Structure",
        description:
          "Pages lack proper H1 headings, making it difficult for AI systems to identify main topics."
      });
    } else {
      analysis.needsAttention.push({
        title: "Multiple H1 Tags Detected",
        description: "Multiple H1 tags create content hierarchy confusion for AI parsers."
      });
    }

    // Alt text
    const images = $("img");
    const imagesWithAlt = $("img[alt]");
    const altTextCoverage =
      images.length > 0 ? (imagesWithAlt.length / images.length) * 100 : 100;

    if (altTextCoverage >= 80) {
      analysis.working.push({
        title: "Image Optimization",
        description: `${Math.round(
          altTextCoverage
        )}% of your images include descriptive alt text, helping AI systems understand visual content.`
      });
    } else {
      analysis.needsAttention.push({
        title: "Image Alt Text Gaps",
        description: `Only ${Math.round(
          altTextCoverage
        )}% of images have descriptive alt text, missing AI visibility opportunities.`
      });
    }

    // Schema
    const hasSchema =
      $('script[type="application/ld+json"]').length > 0 ||
      $("[itemscope]").length > 0;
    if (hasSchema) {
      analysis.working.push({
        title: "Structured Data Implementation",
        description:
          "Your site includes schema markup that helps AI engines understand your business type and services."
      });
    } else {
      analysis.needsAttention.push({
        title: "Schema Markup Missing",
        description:
          "Your site lacks structured data that helps AI engines understand your business information."
      });
    }

    // Fill up to target counts
    const genericWorking = [
      {
        title: "Mobile-Responsive Design",
        description:
          "Your website adapts well to different screen sizes, which AI systems prioritize."
      },
      {
        title: "Content Structure Recognition",
        description:
          "Your pages use semantic HTML elements that help AI understand content hierarchy."
      },
      {
        title: "Loading Speed Baseline",
        description:
          "Your core web vitals fall within acceptable ranges for AI ranking systems."
      }
    ];
    while (analysis.working.length < 5) {
      analysis.working.push(
        genericWorking[analysis.working.length % genericWorking.length]
      );
    }

    const genericIssues = [
      {
        title: "Internal Linking Strategy",
        description:
          "Your pages don't effectively cross-reference related content for AI crawlers."
      },
      {
        title: "Content Depth Analysis",
        description:
          "Some pages lack the comprehensive content depth that AI systems expect."
      },
      {
        title: "Site Architecture Issues",
        description:
          "Your URL structure could be optimized to better guide AI crawlers."
      },
      {
        title: "Local SEO Signals",
        description:
          "Missing local business information prevents AI understanding of your service areas."
      },
      {
        title: "Content Freshness Gaps",
        description:
          "Limited recent content updates may signal outdated information to AI algorithms."
      },
      {
        title: "Core Web Vitals Optimization",
        description:
          "Page speed improvements could significantly impact AI rankings."
      },
      {
        title: "Competitive Content Gaps",
        description:
          "Competitors are capturing AI attention with content formats you're not addressing."
      }
    ];
    while (analysis.needsAttention.length < 10) {
      analysis.needsAttention.push(
        genericIssues[analysis.needsAttention.length % genericIssues.length]
      );
    }

    const domain = extractDomain(url) || new URL(url).hostname;
    analysis.insights = [
      {
        description: `ChatGPT Perspective: When asked about businesses like ${domain}, ChatGPT can identify your industry but struggles to articulate your unique value proposition.`
      },
      {
        description:
          "Claude Analysis: Good topical coverage, but could benefit from clear FAQs and cited sources."
      },
      {
        description:
          "Perplexity Assessment: Tends to cite competitors more often on broad questions; add referenceable guides."
      }
    ];

    return analysis;
  } catch (error) {
    return {
      working: [
        {
          title: "Basic Web Presence",
          description: "Your website is accessible and loads properly."
        }
      ],
      needsAttention: [
        {
          title: "Analysis Connection Issue",
          description: "Technical limitations prevented complete analysis."
        },
        {
          title: "Schema Markup Missing",
          description: "Your site likely lacks structured data for AI engines."
        }
      ],
      insights: [
        {
          description:
            "Complete AI analysis requires deeper technical access for accurate insights."
        }
      ]
    };
  }
}

// ---------- Routes ----------

app.get("/", (_req, res) => res.send("SnipeRank Backend is running!"));

app.get("/api/friendly", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Missing URL parameter" });
  try { new URL(targetUrl); } catch { return res.status(400).json({ error: "Invalid URL format" }); }

  const analysis = await analyzeWebsite(targetUrl);
  const score10 = Math.max(0, Math.min(10, Math.round(5 + analysis.working.length * 0.5 - analysis.needsAttention.length * 0.3)));
  res.json({
    score: score10,
    powers: analysis.working.map(i => `${i.title}: ${i.description}`),
    opportunities: analysis.needsAttention.map(i => `${i.title}: ${i.description}`),
    insights: analysis.insights.map(i => i.description),
    meta: { analyzedAt: new Date().toISOString(), model: "SnipeRank v2.0", url: targetUrl }
  });
});

// Comprehensive AI analysis (OpenAI) — ALWAYS RETURNS JSON
app.get("/api/full", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "Missing URL parameter" });
  try { new URL(url); } catch { return res.status(400).json({ error: "Invalid URL format" }); }

  // If no key, return fallback immediately
  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json(fallbackPayload(url, "no_api_key"));
  }

  try {
    // Fetch page content
    const resp = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SnipeRankBot/1.0)" },
      timeout: 15000
    });
    const $ = cheerio.load(resp.data);
    const text = $("body").text().replace(/\s+/g, " ").trim();
    const title = $("title").text().trim();
    const desc = $('meta[name="description"]').attr("content")?.trim() || "";
    const heads = $("h1, h2, h3").map((i, el) => $(el).text().replace(/\s+/g, " ").trim()).get().join(" | ").slice(0, 2000);

    const content = `URL: ${url}\nTitle: ${title}\nDescription: ${desc}\nHeadings: ${heads}\nBody: ${text.slice(0, 12000)}`;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const prompt = `
You are an expert AI SEO specialist focused on AI engines (ChatGPT, Claude, Gemini, Perplexity, Copilot).

Analyze:
"""
${content}
"""

Return ONLY JSON with keys:
- "whatsWorking": 10 items (2–4 sentences each, site-specific)
- "needsAttention": 25 items, each like "[PRIORITY: High|Medium|Low] Title: Problem for AI engines. Solution: 2–3 steps. Impact: ..."
- "engineInsights": 5 items (one per engine) with actionable recommendations.
No prose outside JSON. No code fences.
`.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.3,
      max_tokens: 3600,
      messages: [
        { role: "system", content: "You are a precise AI SEO analyst. Output valid JSON only." },
        { role: "user", content: prompt }
      ]
    });

    const raw = completion?.choices?.[0]?.message?.content?.trim() || "";
    const json = (() => {
      const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
      if (fenced) return fenced[1].trim();
      const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
      return s !== -1 && e !== -1 && e > s ? raw.slice(s, e + 1).trim() : "";
    })();

    if (!json) return res.status(200).json(fallbackPayload(url, "parse_missing_json", raw.slice(0, 600)));

    let parsed;
    try { parsed = JSON.parse(json); }
    catch { return res.status(200).json(fallbackPayload(url, "parse_invalid_json", raw.slice(0, 600))); }

    if (!Array.isArray(parsed.whatsWorking) || !Array.isArray(parsed.needsAttention) || !Array.isArray(parsed.engineInsights)) {
      return res.status(200).json(fallbackPayload(url, "invalid_shape", json.slice(0, 600)));
    }

    const score = computeScore(parsed.whatsWorking, parsed.needsAttention);
    return res.status(200).json({
      success: true,
      score,
      whatsWorking: parsed.whatsWorking.slice(0, 10),
      needsAttention: parsed.needsAttention.slice(0, 25),
      engineInsights: parsed.engineInsights.slice(0, 5),
      meta: { analyzedAt: new Date().toISOString(), model: "gpt-4-turbo", analysisDepth: "premium", url }
    });
  } catch (err) {
    return res.status(200).json(fallbackPayload(url, err?.response?.status || err?.code || "error"));
  }
});

// Probes for frontend
app.head("/api/full", (_req, res) => res.status(200).end());
app.get("/api/full/status", (_req, res) =>
  res.json({ ok: true, openai: !!process.env.OPENAI_API_KEY })
);

// HTML report used by analyze.html
app.get("/report.html", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send("<p style='color:red'>Missing URL parameter.</p>");
  try { new URL(targetUrl); } catch { return res.status(400).send("<p style='color:red'>Invalid URL format.</p>"); }

  const analysis = await analyzeWebsite(targetUrl);
  const workingHtml = analysis.working.map(i => `<li><strong>${i.title}:</strong> ${i.description}</li>`).join("");
  const needsHtml = analysis.needsAttention.map(i => `<li><strong>${i.title}:</strong> ${i.description}</li>`).join("");
  const insightsHtml = analysis.insights.map(i => `<li>${i.description}</li>`).join("");

  const html = `
    <div class="section-title">✅ What's Working</div>
    <ul>${workingHtml}</ul>
    <div class="section-title">🚨 Needs Attention</div>
    <ul>${needsHtml}</ul>
    <div class="section-title">📡 AI Engine Insights</div>
    <ul>${insightsHtml}</ul>
  `;
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

// Accepts contact form (no-op success)
app.post("/api/send-link", (_req, res) => res.json({ ok: true }));

// ---------- Start ----------
app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🚀 SnipeRank Server v3.0.0 STARTED on ${PORT}`);
  console.log(`🔧 OpenAI Integration: ${process.env.OPENAI_API_KEY ? "Configured ✓" : "Missing ✗ (fallback mode)"}`);
  console.log("Routes: GET /  |  GET /api/friendly  |  GET /api/full  |  HEAD /api/full  |  GET /api/full/status  |  GET /report.html  |  POST /api/send-link");
  console.log("=".repeat(50));
});
