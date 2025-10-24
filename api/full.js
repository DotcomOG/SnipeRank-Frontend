/*
  api/full.js - v3.0.0 - October 24, 2025
  
  CHANGELOG:
  - Enhanced ChatGPT prompts for detailed AI visibility analysis (vs generic SEO)
  - Increased output to 10 strengths / 25 opportunities (from 7/20)
  - Added solution-focused responses with implementation steps
  - Improved content analysis depth (increased from 10k to 15k characters)
  - Added implementation priority indicators (High/Medium/Low)
  - Enhanced AI engine-specific insights with actionable recommendations
  - Added fallback error handling for OpenAI API failures
  - Improved response parsing with better error messages
  
  FEATURES:
  - Deep website content analysis using Cheerio
  - AI visibility-focused SEO recommendations
  - Detailed implementation guidance for each issue
  - Priority-based action items
  - Engine-specific optimization strategies
  
  API RESPONSE FORMAT:
  - whatsWorking: Array of 10 detailed strength descriptions
  - needsAttention: Array of 25 issues with solutions and priorities
  - engineInsights: Array of 5 AI platform-specific recommendations
  - success: Boolean indicating analysis completion
  - score: Calculated visibility score
  
  DEPENDENCIES:
  - OpenAI API (GPT-4-turbo model)
  - OPENAI_API_KEY environment variable required
  - Axios for HTTP requests
  - Cheerio for HTML parsing
  
  INTEGRATION:
  - Called from full-report.html via /api/full?url=...
  - Used for paid/premium reports (vs free /api/friendly)
  - Designed for comprehensive 2-5 minute analysis experience
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
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SnipeRankBot/1.0)"
      },
      timeout: 15000 // Increased timeout for comprehensive analysis
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract more comprehensive content for analysis
    const textContent = $("body").text();
    const pageTitle = $("title").text();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const headings = $("h1, h2, h3").map((i, el) => $(el).text()).get().join(' | ');
    
    // Comprehensive content package for AI analysis
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

    Generate a comprehensive, client-facing AI SEO analysis with the following structure:

    1. ✅ "What's Working" (exactly 10 items):
    - Identify specific strengths that improve visibility in AI search results
    - Focus on: content structure, semantic clarity, authority signals, AI crawlability
    - Each item should be 3-4 sentences explaining WHY it helps AI engines
    - Use confident, professional language that reassures the client
    - Avoid generic platitudes - be specific to this site's actual strengths

    2. 🚨 "Needs Attention" (exactly 25 items):
    - Focus on AI visibility optimization opportunities (not traditional SEO)
    - Each item must include: PROBLEM + WHY IT MATTERS + SPECIFIC SOLUTION + PRIORITY LEVEL
    - Format each as: "[PRIORITY: High/Medium/Low] Issue Title: Problem description explaining impact on AI engines. Solution: Specific 2-3 step implementation guide."
    - Prioritize: Content clarity, structured data, AI prompt alignment, semantic optimization
    - Be dramatic about missed opportunities but always provide clear solutions
    - Include implementation difficulty and expected impact

    3. 🤖 "AI Engine Insights" (exactly 5 insights):
    - Provide specific analysis for how ChatGPT, Claude, Gemini, Perplexity, and Copilot would interpret this site
    - Each insight should identify a specific visibility gap or opportunity for that AI platform
    - Include actionable recommendations specific to each AI engine's behavior
    - Focus on prompt patterns, content interpretation, and ranking factors unique to each platform

    Critical requirements:
    - Use plain English, avoid technical jargon
    - Every recommendation must be actionable and specific
    - Focus on AI visibility, not traditional search engine optimization
    - Provide implementation timelines (quick wins vs long-term projects)
    - Format as valid JSON with fields: whatsWorking, needsAttention, engineInsights

    Make this analysis worth the premium price - detailed, specific, and immediately actionable for AI optimization.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert AI SEO analyst specializing in optimizing websites for AI search engines and language models. Provide detailed, actionable analysis focused specifically on AI visibility factors."
        },
        {
          role: "user",
          content: enhancedPrompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent, professional responses
      max_tokens: 4000   // Increased for detailed responses
    });

    let parsed;
    try {
      // Try to extract JSON from response
      const responseText = completion.choices[0].message.content;
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        parsed = JSON.parse(jsonString);
      } else {
        throw new Error("No valid JSON found in response");
      }

      // Validate response structure
      if (!parsed.whatsWorking || !parsed.needsAttention || !parsed.engineInsights) {
        throw new Error("Invalid response structure from OpenAI");
      }

      // Ensure correct array lengths
      if (parsed.whatsWorking.length !== 10) {
        console.warn(`Expected 10 strengths, got ${parsed.whatsWorking.length}`);
      }
      if (parsed.needsAttention.length !== 25) {
        console.warn(`Expected 25 opportunities, got ${parsed.needsAttention.length}`);
      }

    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      return res.status(500).json({ 
        error: "Failed to parse AI analysis results", 
        details: parseError.message,
        rawResponse: completion.choices[0].message.content.substring(0, 500)
      });
    }

    // Calculate AI visibility score based on analysis
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
        url: url
      }
    });

  } catch (error) {
    console.error('Full analysis error:', error);
    
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

    if (error.message && error.message.includes('API key')) {
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
