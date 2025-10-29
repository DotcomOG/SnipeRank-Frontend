/*
  api/full.js - v3.2.0 — WITH REAL SEO INTELLIGENCE
  Purpose: Comprehensive AI SEO analysis with actual performance data
  NEW: Google PageSpeed Insights API integration
  ENV Required: OPENAI_API_KEY, PAGESPEED_API_KEY
*/

import OpenAI from "openai";
import cheerio from "cheerio";
import axios from "axios";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL parameter" });

  // Validate API keys
  if (!process.env.OPENAI_API_KEY || !process.env.PAGESPEED_API_KEY) {
    return res.status(200).json(fallbackPayload(url, "missing_api_keys"));
  }

  try {
    // 🔄 PARALLEL DATA COLLECTION (faster than sequential)
    const [htmlResp, pageSpeedData] = await Promise.allSettled([
      // Fetch website content
      axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SnipeRankBot/1.0)" },
        timeout: 15000
      }),
      // Fetch PageSpeed performance data
      fetchPageSpeedData(url)
    ]);

    // Extract website content
    let contentData = {};
    if (htmlResp.status === 'fulfilled') {
      const $ = cheerio.load(htmlResp.value.data);
      contentData = {
        textContent: $("body").text().replace(/\s+/g, " ").trim(),
        pageTitle: $("title").text().trim(),
        metaDescription: $('meta[name="description"]').attr("content")?.trim() || "",
        headings: $("h1, h2, h3").map((i, el) => $(el).text().replace(/\s+/g, " ").trim()).get().join(" | ").slice(0, 2000),
        images: $("img").length,
        imagesWithAlt: $("img[alt]").length,
        internalLinks: $("a[href^='/'], a[href*='" + new URL(url).hostname + "']").length,
        hasSchema: $("script[type='application/ld+json']").length > 0
      };
    }

    // Extract performance data
    let perfData = {};
    if (pageSpeedData.status === 'fulfilled') {
      perfData = pageSpeedData.value;
    }

    // 🧠 ENHANCED AI ANALYSIS WITH REAL DATA
    const analysisPrompt = buildEnhancedPrompt(url, contentData, perfData);

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.3,
      max_tokens: 3600,
      messages: [
        { role: "system", content: "You are a data-driven AI SEO analyst. Use the provided metrics to generate specific, actionable recommendations." },
        { role: "user", content: analysisPrompt }
      ]
    });

    // Parse and validate response
    const raw = completion?.choices?.[0]?.message?.content?.trim() || "";
    const jsonString = extractJSONObject(raw);
    if (!jsonString) {
      return res.status(200).json(fallbackPayload(url, "parse_missing_json", raw.slice(0, 600)));
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return res.status(200).json(fallbackPayload(url, "parse_invalid_json", raw.slice(0, 600)));
    }

    // Validate response structure
    const isValid = Array.isArray(parsed.whatsWorking) && 
                   Array.isArray(parsed.needsAttention) && 
                   Array.isArray(parsed.engineInsights);

    if (!isValid) {
      return res.status(200).json(fallbackPayload(url, "invalid_shape", jsonString.slice(0, 600)));
    }

    // 📊 CALCULATE REAL SEO SCORE (based on actual metrics)
    const score = calculateRealSEOScore(contentData, perfData, parsed);

    return res.status(200).json({
      success: true,
      score,
      whatsWorking: parsed.whatsWorking.slice(0, 10),
      needsAttention: parsed.needsAttention.slice(0, 25),
      engineInsights: parsed.engineInsights.slice(0, 5),
      metrics: {
        performance: perfData,
        technical: {
          imagesWithAlt: contentData.imagesWithAlt || 0,
          totalImages: contentData.images || 0,
          internalLinks: contentData.internalLinks || 0,
          hasSchema: contentData.hasSchema || false,
          metaDescription: !!contentData.metaDescription
        }
      },
      meta: {
        analyzedAt: new Date().toISOString(),
        model: "gpt-4-turbo",
        analysisDepth: "premium-with-performance",
        url,
        dataSourcesUsed: ["content_analysis", "pagespeed_insights", "technical_seo"]
      }
    });

  } catch (error) {
    console.error("Analysis error:", error);
    return res.status(200).json(fallbackPayload(url, String(error?.code || "unknown")));
  }
}

/* ---------- NEW: PAGESPEED API INTEGRATION ---------- */
async function fetchPageSpeedData(url) {
  const apiKey = process.env.PAGESPEED_API_KEY;
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices`;

  try {
    const response = await axios.get(apiUrl, { timeout: 30000 });
    const data = response.data;

    // Extract key metrics
    const lighthouse = data.lighthouseResult;
    const audits = lighthouse?.audits || {};
    
    return {
      performanceScore: lighthouse?.categories?.performance?.score * 100 || 0,
      seoScore: lighthouse?.categories?.seo?.score * 100 || 0,
      accessibilityScore: lighthouse?.categories?.accessibility?.score * 100 || 0,
      bestPracticesScore: lighthouse?.categories?.['best-practices']?.score * 100 || 0,
      
      // Core Web Vitals
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      fid: audits['max-potential-fid']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      
      // Technical issues
      missingAltText: audits['image-alt']?.score < 1,
      missingMetaDescription: audits['meta-description']?.score < 1,
      httpStatus: audits['is-on-https']?.score === 1 ? 'https' : 'http',
      
      // Performance metrics
      totalBlockingTime: audits['total-blocking-time']?.numericValue || 0,
      speedIndex: audits['speed-index']?.numericValue || 0,
      
      // Additional insights
      mobileUsable: data.loadingExperience?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category !== 'SLOW'
    };
  } catch (error) {
    console.warn("PageSpeed API failed:", error.message);
    return null; // Graceful degradation
  }
}

/* ---------- ENHANCED PROMPT WITH REAL DATA ---------- */
function buildEnhancedPrompt(url, contentData, perfData) {
  const performanceSection = perfData ? `

ACTUAL PERFORMANCE METRICS:
- Performance Score: ${perfData.performanceScore}/100
- SEO Score: ${perfData.seoScore}/100
- Largest Contentful Paint: ${(perfData.lcp / 1000).toFixed(1)}s
- Cumulative Layout Shift: ${perfData.cls.toFixed(3)}
- Total Blocking Time: ${perfData.totalBlockingTime}ms
- Missing Alt Text: ${perfData.missingAltText ? 'YES' : 'NO'}
- HTTPS Status: ${perfData.httpStatus}

PERFORMANCE BENCHMARKS:
- LCP target: <2.5s (yours: ${(perfData.lcp / 1000).toFixed(1)}s)
- CLS target: <0.1 (yours: ${perfData.cls.toFixed(3)})
- Performance target: >90 (yours: ${perfData.performanceScore})
` : "";

  const technicalSection = `
TECHNICAL SEO AUDIT:
- Images: ${contentData.imagesWithAlt || 0}/${contentData.images || 0} have alt text
- Meta Description: ${contentData.metaDescription ? 'Present' : 'MISSING'}
- Internal Links: ${contentData.internalLinks || 0} found
- Schema Markup: ${contentData.hasSchema ? 'Present' : 'MISSING'}
`;

  return `
You are an expert AI SEO specialist. Analyze this website using the REAL PERFORMANCE DATA provided below.

URL: ${url}
Title: ${contentData.pageTitle || 'Not found'}
Meta Description: ${contentData.metaDescription || 'MISSING'}

${performanceSection}${technicalSection}

Sample Content: ${(contentData.textContent || '').slice(0, 8000)}

Instructions:
- Use the ACTUAL METRICS above to generate specific recommendations
- Include exact numbers in your analysis (LCP times, missing alt tags, etc.)
- Prioritize issues based on real performance impact
- Provide measurable outcomes for each recommendation

Return ONLY JSON with these exact keys:
- "whatsWorking": array of 10 items highlighting current strengths
- "needsAttention": array of 25 items. Format: "[PRIORITY: High|Medium|Low] Title: Specific issue with metrics. Solution: Concrete steps. Impact: Expected improvement."
- "engineInsights": array of 5 items (ChatGPT, Claude, Gemini, Perplexity, Copilot specific advice)

Focus on actionable insights that leverage the performance data provided.
`.trim();
}

/* ---------- REAL SEO SCORING ALGORITHM ---------- */
function calculateRealSEOScore(contentData, perfData, aiAnalysis) {
  let score = 50; // Base score
  
  // Performance factors (40% of score)
  if (perfData) {
    score += (perfData.performanceScore - 50) * 0.4; // Performance score impact
    score += (perfData.seoScore - 50) * 0.3; // SEO score impact
    
    // Core Web Vitals penalties/bonuses
    if (perfData.lcp < 2500) score += 5; // Good LCP
    else if (perfData.lcp > 4000) score -= 8; // Poor LCP
    
    if (perfData.cls < 0.1) score += 3; // Good CLS
    else if (perfData.cls > 0.25) score -= 5; // Poor CLS
  }
  
  // Technical SEO factors (30% of score)
  if (contentData.metaDescription) score += 3;
  if (contentData.hasSchema) score += 5;
  
  // Image optimization (10% of score)
  if (contentData.images > 0) {
    const altCoverage = (contentData.imagesWithAlt / contentData.images);
    score += altCoverage * 10; // 0-10 points based on alt text coverage
  }
  
  // AI analysis quality (20% of score)
  const strengths = aiAnalysis.whatsWorking?.length || 0;
  const issues = aiAnalysis.needsAttention?.length || 0;
  score += Math.min(strengths * 2, 10); // Max 10 bonus for strengths
  score -= Math.min(issues * 0.5, 15); // Max 15 penalty for issues
  
  // Ensure score is within bounds
  return Math.max(20, Math.min(100, Math.round(score)));
}

/* ---------- EXISTING HELPER FUNCTIONS ---------- */
function extractJSONObject(text) {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1).trim();
  }
  return "";
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
      "[PRIORITY: High] Performance Analysis Required: Unable to retrieve performance metrics. Solution: Verify site accessibility and try again. Impact: Complete performance assessment.",
      "[PRIORITY: Medium] Technical SEO Audit Needed: Basic technical factors require verification. Solution: Manual review of meta tags, schema, and images. Impact: Improved AI engine understanding."
    ],
    engineInsights: [
      "Performance data is essential for AI visibility optimization.",
      "Complete technical audit recommended for accurate insights.",
      "Retry analysis when technical issues are resolved.",
      "Monitor Core Web Vitals for AI search performance.",
      "Ensure consistent site accessibility for all engines."
    ],
    meta: { url, mode: "fallback", reason, snippet, requiresRetry: true }
  };
}
