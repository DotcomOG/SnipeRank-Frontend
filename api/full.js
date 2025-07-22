// 📅 Updated: June 30, 2025 at 2:34 PM ET

import OpenAI from "openai";
import cheerio from "cheerio";
import axios from "axios";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SnipeRankBot/1.0)"
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);
    const textContent = $("body").text();

    const prompt = `You are an expert AI SEO analyst.
    A user has submitted the following website content for SEO evaluation:
    """
    ${textContent.slice(0, 10000)}
    """

    Generate a persuasive, client-facing SEO report structured as follows:

    1. ✅ "What's Working" (7 items):
    - Identify strengths in the SEO or content strategy that would appeal to AI-driven search engines.
    - Write 2–3 sentence explanations per item.
    - Use varied language and avoid repetitive phrases.
    - Reassure the reader that some foundational SEO elements are strong.

    2. 🚨 "Needs Attention" (20 items):
    - Focus on weaknesses or omissions that could hurt visibility in AI-driven search results.
    - For each item, explain *why the issue matters* in impactful, professional language.
    - Avoid repeating sentence structures and do not start every line with the word "AI".
    - Do NOT include fix instructions.
    - Each item must be 4–5 sentences, persuasive, and dramatic in tone to emphasize missed opportunities or risks.

    3. 📡 "AI Engine Insights" (5 insights):
    - Provide unique observations tailored to AI platforms like ChatGPT, Gemini, Perplexity, Copilot, and Claude.
    - Each insight should emphasize visibility risk or opportunity *in that specific engine*.
    - Avoid repeating phrasing. Use varied sentence openers.
    - Keep tone confident, expert, and succinct (2–3 sentences).

    Use plain English. Format output as a JSON object with three fields: whatsWorking, needsAttention, engineInsights.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });

    let parsed;
    try {
      const firstCodeBlock = completion.choices[0].message.content.match(/```json([\s\S]*?)```/);
      const json = firstCodeBlock ? firstCodeBlock[1] : completion.choices[0].message.content;
      parsed = JSON.parse(json);
    } catch (err) {
      return res.status(500).json({ error: "Failed to parse GPT output.", raw: completion.choices[0].message.content });
    }

    return res.status(200).json(parsed);
  } catch (error) {
    if (error.response && error.response.status === 403) {
      return res.status(403).json({ error: "The website appears to block automated analysis tools. Try another URL or contact us for help." });
    }
    return res.status(500).json({ error: "Analysis failed.", details: error.message });
  }
}
