// api/full.js
/**
 * SnipeRank Serverless API - Full Analysis & Scoring
 * Version: v2.20 - Unified Low Score (Conversion Focus)
 * Changes: Removed inconsistency, applied -30 point penalty to all scores to ensure consistent low scoring (around 53/100) to meet conversion goals.
 */

import { OpenAI } from 'openai';
import axios from 'axios';
import cheerio from 'cheerio';

// Initialize OpenAI client, explicitly passing API key
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pagespeedApiKey = process.env.PAGESPEED_API_KEY;

// --- Scoring Logic (Adjusted for Conversion Goal) ---
// This function calculates the final score based on SEO and Performance,
// but intentionally applies a penalty to keep the score in the "Needs Improvement" range (around 50-60)
function calculateFinalScore(lighthouseResults) {
    if (!lighthouseResults || !lighthouseResults.categories) {
        return 0;
    }

    const performanceScore = lighthouseResults.categories.performance.score * 100;
    const seoScore = lighthouseResults.categories.seo.score * 100;
    const accessibilityScore = lighthouseResults.categories.accessibility.score * 100;

    // Weighting: Higher weight on SEO/Accessibility, but overall score should be kept low.
    // We will use the lowest of the three primary scores, then apply a penalty to ensure the score is never too high.
    
    // 1. Find the lowest performing category score.
    const lowestCategoryScore = Math.min(performanceScore, seoScore, accessibilityScore);
    
    // 2. Average the scores.
    const averageScore = (performanceScore + seoScore + accessibilityScore) / 3;

    // 3. Combine with a bias towards the low score (to drive conversions).
    // Take 60% of the lowest score and 40% of the average score.
    let finalScore = (lowestCategoryScore * 0.6) + (averageScore * 0.4);

    // 4. Apply a consistent penalty to all scores to ensure they remain low.
    // This is the key line to ensure you get a score around 53.
    // The fixed penalty ensures high-performing sites still receive a score that incentivizes seeking assistance.
    finalScore = Math.max(0, finalScore - 30); // Deduct 30 points, minimum score 0.

    return Math.round(finalScore);
}
// --- End Scoring Logic ---

export default async (req, res) => {
    // Set CORS headers for Vercel
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).send();
    }

    const { url, mode = 'score' } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required.' });
    }

    try {
        const pagespeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${pagespeedApiKey}&strategy=mobile`;
        
        // 1. Fetch PageSpeed Data
        const pagespeedResponse = await axios.get(pagespeedUrl);
        const lighthouseResults = pagespeedResponse.data.lighthouseResult;

        if (!lighthouseResults) {
            return res.status(500).json({ error: 'Failed to retrieve Lighthouse results.' });
        }

        // 2. Calculate Score (UNIFIED LOGIC)
        const score = calculateFinalScore(lighthouseResults);
        
        if (mode === 'score') {
            // This is the fast preview mode
            return res.status(200).json({ score });
        }

        // --- FULL REPORT LOGIC (mode !== 'score') ---
        
        // 3. Fetch Page Content for AI
        const htmlResponse = await axios.get(url);
        const $ = cheerio.load(htmlResponse.data);
        const pageContent = $('body').text().substring(0, 10000); // Limit content length for OpenAI

        // 4. Extract Key Metrics
        const metrics = {
            performance: Math.round(lighthouseResults.categories.performance.score * 100),
            seo: Math.round(lighthouseResults.categories.seo.score * 100),
            accessibility: Math.round(lighthouseResults.categories.accessibility.score * 100),
            lcp: lighthouseResults.audits['largest-contentful-paint'].displayValue,
            cls: lighthouseResults.audits['cumulative-layout-shift'].displayValue,
            tbt: lighthouseResults.audits['total-blocking-time'].displayValue,
        };
        
        // 5. Generate AI Analysis
        const prompt = `Analyze the provided website content and Lighthouse scores for ${url}. The calculated overall score is ${score}/100. Provide a critical, actionable SEO analysis focused on why the score is poor and what the user must do to improve it. Structure the output in a JSON object with two fields: 'summary' (a critical one-paragraph summary) and 'actions' (a list of 5-7 numbered, critical actions to improve SEO, speed, and content for AI ranking). Focus on high-value, paid services and complex tasks that require expert help.`;

        const chatCompletion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // Use a powerful model for critical analysis
            messages: [
                { role: "system", content: "You are an expert SEO and Core Web Vitals analyst. Your goal is to provide a critical, actionable report that clearly justifies the need for professional consulting." },
                { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
        });

        const aiAnalysis = JSON.parse(chatCompletion.choices[0].message.content);

        // 6. Return the Full Report
        return res.status(200).json({
            url,
            score, // The same consistently low score
            metrics,
            summary: aiAnalysis.summary,
            actions: aiAnalysis.actions,
            rawLighthouse: lighthouseResults,
        });

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        
        let errorMessage = 'An unknown server error occurred.';
        if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
        } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
            errorMessage = 'Could not resolve the hostname (invalid URL).';
        }
        
        return res.status(500).json({ 
            error: 'Server Error: ' + errorMessage,
            details: error.message 
        });
    }
};
