
# 🧠 SnipeRank – AI SEO Analyzer: Project Summary & Handoff

## ✅ Purpose
SnipeRank is a client-facing AI SEO analysis tool built to:
- Accept a user-provided URL
- Analyze it using OpenAI (GPT-3.5)
- Return:
  - 5 persuasive strengths (formerly "superpowers")
  - 10 detailed AI SEO opportunities
  - 5 insight paragraphs from top AI engines (Gemini, ChatGPT, Perplexity, etc.)

It is designed to showcase AI SEO skills and convert users into consulting leads.

---

## 🧱 Project Structure

```
ai-seo-analyzer-v2/
├── public/
│   ├── index.html
│   ├── index.js
│   ├── full-report.html
│   ├── full-report.js
│   ├── thank-you.html
│   └── img/                # AI engine logos (optional, now removed)
├── api/
│   ├── friendly.js         # Main summary analysis endpoint
│   ├── full.js             # Full-report endpoint
```

---

## ⚙️ Stack

| Layer     | Tech                          |
|-----------|-------------------------------|
| Frontend  | HTML + TailwindCSS (CDN) + JS |
| Backend   | Vercel serverless functions   |
| AI Engine | OpenAI GPT-3.5-turbo          |
| Hosting   | Vercel                        |

---

## ✅ Features

- Lightbox-style URL input
- GPT-powered AI SEO breakdown
- Bullet system with emojis (✅, 🚨)
- Detailed full report and contact form
- Email capture form with redirect to thank-you page
- Optional logo rotation (disabled)
- API route: `/api/friendly` for summaries, `/api/full` for full reports

---

## ❌ Current Issues

| Area          | Problem Description |
|---------------|---------------------|
| API           | `/api/friendly` fails to return JSON (likely not deployed or missing API key) |
| Deployments   | Static-only version currently live |
| Git/Vercel    | Repo was disconnected from Vercel and then reconnected, possibly mislinked |
| Environment   | `OPENAI_API_KEY` may be missing from Vercel project settings |
| JS Execution  | `index.js` loads but fails due to bad API response |
| Function Logs | Vercel's Functions tab does not show the deployed API routes |
| Rollbacks     | All previous working deploys (e.g., `seo-snapshot-qz0bunj7o...`) are no longer accessible |
| Image issues  | Logos were inconsistent, removed for now |
| Insight Section | AI logo + insight layout broke layout; reverted to left-aligned text-only list |

---

## 🔁 Suggested Tasks for CodeX

- [ ] Rebuild and confirm working `/api/friendly` route
- [ ] Verify `OPENAI_API_KEY` exists in Vercel environment variables
- [ ] Make sure `index.js` calls renderReport() only if data is JSON
- [ ] Reconnect Git to correct Vercel project
- [ ] Re-establish production branch (`main`) and set it in Vercel
- [ ] Confirm API and frontend function on new deploy
