/* api/full.js - v4.0.2 — Unified API with Real SEO Intelligence (STABILITY FIX)
  Purpose: Comprehensive AI SEO analysis that serves both the /api/score (small) and /api/full (large) payloads.
  FIX: Switched from the floating "gpt-4-turbo" preview model name to the STABLE production name "gpt-4-turbo-2024-04-09" to ensure reliable JSON output and prevent the 95% hang bug.
  ENV Required: OPENAI_API_KEY, PAGESPEED_API_KEY
*/

import OpenAI from "openai";
import cheerio from "cheerio";
import axios from "axios";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Configuration Constants (for AI analysis) ---
const PILLAR_MAX_SCORE = 25;
const PILLAR_WEIGHTS = {
  // Weights based on overall score impact in calculateRealSEOScore()
  access: 0.25, // Technical SEO/Schema/HTTPS/Crawlability
  trust: 0.30,  // Trust factors, SEO Score
  clarity: 0.20, // Content/Title/Meta/Headings
  alignment: 0.25 // Performance/CWV
};
const MODEL_NAME = "gpt-4-turbo-2024-04-09";

export default async function handler(req, res) {
  // Determine if this is a request for the small score payload or the full report
  const { url, mode } = req.query; 
  const isScoreMode = mode === 'score'; // This allows analyze.html to request the small payload

  if (!url) return res.status(400).json(fallbackPayload(url, "Missing URL parameter"));

  // Validate API keys
  if (!process.env.OPENAI_API_KEY || !process.env.PAGESPEED_API_KEY) {
    return res.status(500).json(fallbackPayload(url, "missing_api_keys"));
  }

  try {
    // 🔄 PARALLEL DATA COLLECTION
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
    } else {
        console.warn("Website content fetch failed:", htmlResp.reason);
    }


    // Extract performance data
    let perfData = {};
    if (pageSpeedData.status === 'fulfilled' && pageSpeedData.value) {
      perfData = pageSpeedData.value;
    } else {
        console.warn("PageSpeed data failed or returned null.");
    }

    // 🧠 ENHANCED AI ANALYSIS WITH REAL DATA
    const analysisPrompt = buildEnhancedPrompt(url, contentData, perfData, isScoreMode);

    const completion = await openai.chat.completions.create({
      model: MODEL_NAME,
      temperature: 0.4,
      max_tokens: 3800, 
      messages: [
        { role: "system", content: "You are a data-driven AI SEO analyst. Use the provided metrics to generate specific, actionable recommendations." },
        { role: "user", content: analysisPrompt }
      ]
    });

    // Parse and validate response
    const raw = completion?.choices?.[0]?.message?.content?.trim() || "";
    const jsonString = extractJSONObject(raw);
    if (!jsonString) {
      // Return a 500 error but use the safe fallback payload structure
      return res.status(500).json(fallbackPayload(url, "parse_missing_json", raw.slice(0, 600)));
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      return res.status(500).json(fallbackPayload(url, "parse_invalid_json", raw.slice(0, 600)));
    }

    // Validate and use structured parts
    const aiData = {
      whatsWorking: parsed.whatsWorking || [],
      needsAttention: parsed.needsAttention || [],
      engineInsights: parsed.engineInsights || [],
      fullReportContent: parsed.fullReportContent || "Detailed content missing.",
      executiveSummary: parsed.executiveSummary || "Summary missing."
    };
    
    // 📊 CALCULATE REAL SEO SCORE & PILLARS (based on actual metrics)
    const { score, pillarScores } = calculateRealSEOScoreAndPillars(contentData, perfData, aiData);

    // --- Format Final Response ---
    const basePayload = {
      score: {
          overall: score,
          band: getScoreBand(score)
      },
      pillars: transformToPillars(pillarScores),
      llm_insights: transformToLLMInsights(aiData.engineInsights),
      meta: {
        analyzedAt: new Date().toISOString(),
        model: MODEL_NAME,
        url,
      }
    };
    
    if (isScoreMode) {
        // Response for /api/score (used by analyze.html)
        return res.status(200).json({
            ...basePayload,
            highlights: transformToHighlights(aiData.whatsWorking, aiData.needsAttention).slice(0, 10),
            summary: aiData.executiveSummary
        });
    } else {
        // Response for /api/full (used by full-report.html)
        return res.status(200).json({
            ...basePayload,
            action_items: transformToActionItems(aiData.needsAttention).slice(0, 5),
            full_report_content: aiData.fullReportContent
        });
    }

  } catch (error) {
    console.error("Analysis error:", error);
    // Ensure 500 error code but use safe payload
    return res.status(500).json(fallbackPayload(url, String(error?.code || "unknown")));
  }
}

/* ------------------- CORE HELPER FUNCTIONS ------------------- */

/** Calculates overall score and scores for the four pillars. */
function calculateRealSEOScoreAndPillars(contentData, perfData, aiAnalysis) {
  let overallScore = 50; // Base score
  let pillarScores = { access: 0, trust: 0, clarity: 0, alignment: 0 };
  
  // --- A. AI Access Readiness (Technical SEO / Trust) --- 25%
  let accessScore = PILLAR_MAX_SCORE * 0.1; // Base 2.5/25
  if (contentData.hasSchema) accessScore += 5; // Schema is a major access/interpretability signal
  if (contentData.internalLinks > 5) accessScore += 2; // Good crawl structure
  if (perfData.httpStatus === 'https') accessScore += 3; // HTTPS is fundamental
  accessScore += Math.min((perfData.seoScore || 0) * 0.1, 10); // PageSpeed SEO score contributes to trust/access

  // --- B. Trust & Verification Signals (Authority / Security) --- 25%
  let trustScore = PILLAR_MAX_SCORE * 0.1; // Base 2.5/25
  trustScore += Math.min((perfData.bestPracticesScore || 0) * 0.2, 12); // Best practices score impact
  trustScore += Math.min((contentData.imagesWithAlt / (contentData.images || 1)) * 5, 5); // Alt text coverage
  trustScore += Math.min(aiAnalysis.whatsWorking?.length || 0, 5); // Bonus for observed strengths

  // --- C. LLM Interpretability & Clarity (Content Structure) --- 25%
  let clarityScore = PILLAR_MAX_SCORE * 0.1; // Base 2.5/25
  if (contentData.pageTitle.length > 0) clarityScore += 5;
  if (contentData.metaDescription) clarityScore += 5;
  // Penalty for low content volume (estimate)
  if (contentData.textContent.length < 500) clarityScore -= 5;
  clarityScore += Math.min(10, (contentData.headings.length > 0 ? 5 : 0) + (contentData.headings.length > 100 ? 5 : 0)); // Good heading structure

  // --- D. Prompt-Pattern Alignment (Performance / Speed) --- 25%
  let alignmentScore = PILLAR_MAX_SCORE * 0.1; // Base 2.5/25
  alignmentScore += Math.min((perfData.performanceScore || 0) * 0.1, 10); // Performance score impact
  
  // Core Web Vitals bonuses/penalties
  if (perfData.lcp < 2500) alignmentScore += 4; 
  else if (perfData.lcp > 4000) alignmentScore -= 4; 
    
  if (perfData.cls < 0.1) alignmentScore += 3;
  else if (perfData.cls > 0.25) alignmentScore -= 3;
  
  // Final Score Normalization
  pillarScores = {
    access: Math.max(0, Math.min(PILLAR_MAX_SCORE, accessScore)),
    trust: Math.max(0, Math.min(PILLAR_MAX_SCORE, trustScore)),
    clarity: Math.max(0, Math.min(PILLAR_MAX_SCORE, clarityScore)),
    alignment: Math.max(0, Math.min(PILLAR_MAX_SCORE, alignmentScore)),
  };

  // Recalculate overall score based on combined pillars
  overallScore = Object.values(pillarScores).reduce((sum, score) => sum + score, 0);

  return { score: Math.round(overallScore), pillarScores };
}

/** Determines the visibility band based on the final score. */
function getScoreBand(score) {
    if (score >= 90) return "Optimal Visibility ★★★★★";
    if (score >= 70) return "Highly Visible ★★★★☆";
    if (score >= 55) return "Partially Visible ★★★☆☆";
    if (score >= 40) return "Needs Work ★★☆☆☆";
    return "Low Visibility ★☆☆☆☆";
}

/** Transforms the numeric pillar map into the array format required by the frontend. */
function transformToPillars(pillarScores) {
    return [
        { id: 'access', score: pillarScores.access },
        { id: 'trust', score: pillarScores.trust },
        { id: 'clarity', score: pillarScores.clarity },
        { id: 'alignment', score: pillarScores.alignment }
    ];
}

/** Transforms the AI-generated issues into the structured Action Item format for the full report. */
function transformToActionItems(needsAttention) {
    return needsAttention.map(item => {
        const priorityMatch = item.match(/\[PRIORITY: (High|Medium|Low)\]/i);
        const titleMatch = item.match(/Title: (.*?)\./i);
        const solutionMatch = item.match(/Solution: (.*?)\./i);
        const impactMatch = item.match(/Impact: (.*)/i);
        
        const priority = priorityMatch ? priorityMatch[1] : 'Medium';
        const title = titleMatch ? titleMatch[1].trim() : `Untriaged Issue (${priority})`;
        const description = solutionMatch ? solutionMatch[1].trim() : 'Detailed solution is pending.';
        const impact = impactMatch ? impactMatch[1].trim() : 'Moderate improvement.';
        
        const steps = description.split(/\s*;\s*/).filter(s => s.length > 5); 

        return {
            title,
            priority,
            description: `The AI analysis identified this as a ${priority}-priority issue: ${title}.`,
            impact,
            steps: steps.length > 0 ? steps : [description]
        };
    });
}

/** Transforms AI insights into the simpler bullet point array for the preview's highlights section. */
function transformToHighlights(whatsWorking, needsAttention) {
    const working = whatsWorking.map(s => `✅ Strength: ${s}`);
    const attention = needsAttention.map(item => {
        const titleMatch = item.match(/Title: (.*?)\./i);
        return `⚠️ Issue: ${titleMatch ? titleMatch[1].trim() : item.slice(0, 50)}...`;
    });
    return [...working, ...attention];
}

/** Transforms the AI engine insights into the structured format required by both frontends. */
function transformToLLMInsights(engineInsights) {
    const engines = ["ChatGPT", "Claude", "Gemini", "Perplexity", "Copilot"];
    return engineInsights.map((summary, index) => ({
        engine: engines[index] || "AI Engine",
        summary: summary || "Insight missing."
    }));
}


/* ------------------- EXTERNAL API & PROMPT ------------------- */

async function fetchPageSpeedData(url) {
  const apiKey = process.env.PAGESPEED_API_KEY;
  const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${apiKey}&strategy=mobile&category=performance&category=seo&category=accessibility&category=best-practices`;

  try {
    const response = await axios.get(apiUrl, { timeout: 30000 });
    const data = response.data;

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse?.audits || {};
    
    return {
      performanceScore: lighthouse?.categories?.performance?.score * 100 || 0,
      seoScore: lighthouse?.categories?.seo?.score * 100 || 0,
      accessibilityScore: lighthouse?.categories?.accessibility?.score * 100 || 0,
      bestPracticesScore: lighthouse?.categories?.['best-practices']?.score * 100 || 0,
      
      lcp: audits['largest-contentful-paint']?.numericValue || 0,
      fid: audits['max-potential-fid']?.numericValue || 0,
      cls: audits['cumulative-layout-shift']?.numericValue || 0,
      
      missingAltText: audits['image-alt']?.score < 1,
      missingMetaDescription: audits['meta-description']?.score < 1,
      httpStatus: audits['is-on-https']?.score === 1 ? 'https' : 'http',
      
      totalBlockingTime: audits['total-blocking-time']?.numericValue || 0,
      speedIndex: audits['speed-index']?.numericValue || 0,
      
      mobileUsable: data.loadingExperience?.metrics?.CUMULATIVE_LAYOUT_SHIFT_SCORE?.category !== 'SLOW'
    };
  } catch (error) {
    console.warn("PageSpeed API failed:", error.message);
    return null; 
  }
}

function buildEnhancedPrompt(url, contentData, perfData, isScoreMode) {
  const performanceSection = perfData ? `
ACTUAL PERFORMANCE METRICS:
- Performance Score: ${perfData.performanceScore}/100
- SEO Score: ${perfData.seoScore}/100
- Largest Contentful Paint (LCP): ${(perfData.lcp / 1000).toFixed(1)}s
- Cumulative Layout Shift (CLS): ${perfData.cls.toFixed(3)}
- Total Blocking Time (TBT): ${perfData.totalBlockingTime}ms
- Missing Alt Text: ${perfData.missingAltText ? 'YES' : 'NO'}
- HTTPS Status: ${perfData.httpStatus}

PERFORMANCE BENCHMARKS:
- LCP target: <2.5s (Yours: ${(perfData.lcp / 1000).toFixed(1)}s)
- CLS target: <0.1 (Yours: ${perfData.cls.toFixed(3)})
` : "PERFORMANCE DATA UNAVAILABLE. Base analysis on content structure only.";

  const technicalSection = `
TECHNICAL SEO AUDIT:
- Images: ${contentData.imagesWithAlt || 0}/${contentData.images || 0} have alt text
- Meta Description: ${contentData.metaDescription ? 'Present' : 'MISSING'}
- Internal Links: ${contentData.internalLinks || 0} found
- Schema Markup: ${contentData.hasSchema ? 'Present' : 'MISSING'}
- Headings: ${contentData.headings.slice(0, 500)}...
`;

  const instructions = `
Instructions:
- Use the ACTUAL METRICS above to generate specific recommendations.
- Include exact numbers in your analysis (LCP times, missing alt tags, etc.).
- Prioritize issues based on real performance impact.
- Provide measurable outcomes for each recommendation in the 'needsAttention' array.

Return ONLY JSON with these exact keys:
- "whatsWorking": array of 10 items highlighting current strengths.
- "needsAttention": array of 25 items. Format: "[PRIORITY: High|Medium|Low] Title: Specific issue with metrics. Solution: Concrete steps. Impact: Expected improvement."
- "engineInsights": array of 5 items, one each for ChatGPT, Claude, Gemini, Perplexity, Copilot.
- "executiveSummary": A 3-4 paragraph summary of the key findings and overall AI visibility status. This will be used in the preview report.
- "fullReportContent": A long, detailed, multi-section analysis (approx. 2,000 words). Use internal markdown headers (e.g., ### Section Title) for structure.

Focus on actionable insights that leverage the performance data provided.
`.trim();

  return `
You are an expert AI SEO specialist. Analyze this website using the REAL PERFORMANCE DATA provided below.

URL: ${url}
Title: ${contentData.pageTitle || 'Not found'}

${performanceSection}

${technicalSection}

Sample Content: ${(contentData.textContent || '').slice(0, 8000)}

${instructions}
`.trim();
}

/* ------------------- FALLBACK & UTILITY ------------------- */

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

/** * Returns a structurally valid payload for the frontend, even on a server-side failure. 
 * This prevents frontend crashes/hangs when the server returns a 500 error.
 */
function fallbackPayload(url, reason = "fallback") {
  const basePayload = {
    score: { overall: 50, band: "Needs Work ★★☆☆☆" },
    pillars: [
      { id: 'access', score: 12.5 }, { id: 'trust', score: 12.5 },
      { id: 'clarity', score: 12.5 }, { id: 'alignment', score: 12.5 }
    ],
    llm_insights: [
      { engine: "ChatGPT", summary: `Server failure (${reason}). Insight unavailable.` },
      { engine: "Claude", summary: "Content quality is average; semantic clarity needs improvement." },
      { engine: "Gemini", summary: "Performance metrics are critical for ranking; they could not be retrieved." },
      { engine: "Perplexity", summary: "Verify site accessibility and try again to get full analysis." },
      { engine: "Copilot", summary: "Core web vitals must be stable for reliable AI visibility." }
    ],
    meta: { url, mode: "fallback", reason, requiresRetry: true }
  };
  
  // Construct a generic but complete fallback that matches both score and full contracts
  return {
      ...basePayload,
      summary: `A critical server error or validation issue occurred (Reason: ${reason}). The scores shown are baseline estimates. Please ensure all API keys are valid and the target URL is accessible before retrying.`,
      highlights: [
          `⚠️ High: Service Error - Failed to fetch data. Reason: ${reason}.`,
          "⚠️ Medium: Performance data missing. Cannot calculate Core Web Vitals impact.",
          "✅ Low: Site accessible and basic response received."
      ],
      action_items: [{
          title: "Resolve Backend Error",
          priority: "High",
          description: `The analysis failed due to a server error or malformed data from the AI. The reason reported was: ${reason}.`,
          impact: "Zero AI analysis data.",
          steps: ["Check environment variables (OPENAI_API_KEY, PAGESPEED_API_KEY).", "Examine server logs for the stack trace.", "Ensure the OpenAI response is clean JSON."]
      }],
      full_report_content: `### Report Unavailable\nA critical error occurred during the analysis process. The service logs indicate a failure in external data fetching or JSON validation (Reason: ${reason}). Please resolve the issue and run the report again.`
  };
}
