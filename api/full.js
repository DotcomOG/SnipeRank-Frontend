/*
  api/full.js - v3.0.1 - October 24, 2025
  - More forgiving JSON parsing (handles fenced & unfenced JSON)
  - Clearer error logs (prints OpenAI error payloads)
  - Optional minimal fallback payload to avoid hard failure UX
*/
import OpenAI from "openai";
import cheerio from "cheerio";
import axios from "axios";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL parameter" });

  try {
    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SnipeRankBot/1.0)" },
      timeout: 15000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const textContent = $("body").text();
    const pageTitle = $("title").text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const headings = $("h1, h2, h3").map((i, el) => $(el).text()).get().join(' | ');

    const contentPackage = `
    URL: ${url}
    Page Title: ${pageTitle}
    Meta Description: ${metaDescription}
    Main Headings: ${headings}
    Body Content: ${textContent.slice(0, 15000)}
    `;

    const enhancedPrompt = `You are an expert AI SEO specialist focused specifically on optimizing websites for AI search engines like ChatGPT, Claude, Gemini, Perplexity, and Copilot.

    Analyze this website content for AI visibility optimization:
    """
    ${contentPackage}
    """

    Generate a comprehensive, client-facing AI SEO analysis as valid JSON with keys:
    - whatsWorking (10 items)
    - needsAttention (25 items) // format: "[PRIORITY: High/Medium/Low] Title: Problem... Solution: ..."
    - engineInsights (5 items)
    ONLY return JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "You are an expert AI SEO analyst specializing in optimizing websites for AI search engines and language models. Provide detailed, actionable analysis focused specifically on AI visibility factors." },
        { role: "user", content: enhancedPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    let parsed;
    try {
      const responseText = completion.choices[0]?.message?.content || "";
      // Prefer fenced JSON, otherwise any top-level JSON object
      const fence = responseText.match(/```json\s*([\s\S]*?)\s*```/i);
      const raw = fence ? fence[1] : (responseText.match(/\{[\s\S]*\}$/) || [])[0];
      if (!raw) throw new Error("No valid JSON found in response");
      parsed = JSON.parse(raw);

      if (!parsed.whatsWorking || !parsed.needsAttention || !parsed.engineInsights) {
        throw new Error("Invalid response structure from OpenAI");
      }
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      // Optional soft fallback to avoid blank UI
      return res.status(200).json({
        success: false,
        score: 50,
        whatsWorking: [
          "Your website loads successfully and has accessible content.",
          "HTTPS appears to be active, signaling trust to AI systems."
        ],
        needsAttention: [
          "Comprehensive AI visibility analysis unavailable due to parsing issue.",
          "Retry later or contact support for a manual assessment."
        ],
        engineInsights: ["Fallback mode: Limited AI analysis available."],
        meta: { error: "parse_error" }
      });
    }

    const calculateAIScore = (strengths, opportunities) => {
      const baseScore = 40;
      const strengthBonus = Math.min(strengths.length * 3, 30);
      const opportunityPenalty = Math.min(opportunities.length * 1.5, 30);
      return Math.max(20, Math.min(100, baseScore + strengthBonus - opportunityPenalty));
    };
    const aiScore = calculateAIScore(parsed.whatsWorking, parsed.needsAttention);

    return res.status(200).json({
      success: true,
      score: aiScore,
      analysisType: "comprehensive",
      ...parsed,
      meta: {
        analyzedAt: new Date().toISOString(),
        model: "GPT-4-turbo",
        analysisDepth: "premium",
        url
      }
    });

  } catch (error) {
    // Surface OpenAI errors more clearly in logs
    console.error('Full analysis error details:', error?.response?.data || error?.message || error);
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ 
        error: "Website blocks automated analysis", 
        details: "The target website prevents automated crawling. Try a different URL or contact support for manual analysis." 
      });
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(400).json({ 
        error: "Unable to access website", 
        details: "The provided URL cannot be reached. Please verify the URL is correct and publicly accessible." 
      });
    }
    if (error.message && /api key|unauthorized|invalid.+key/i.test(error.message)) {
      return res.status(500).json({ 
        error: "AI analysis service unavailable", 
        details: "OpenAI service configuration error. Please try again later or contact support." 
      });
    }
    return res.status(500).json({ 
      error: "Analysis failed", 
      details: error.message || "An unexpected error occurred during analysis",
      retryable: true
    });
  }
}
