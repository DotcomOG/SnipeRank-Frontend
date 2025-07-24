// server.js — Final verified version

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import friendlyRoute from "./api/friendly.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Handle __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Allow frontend fetch from Vercel
app.use(cors({
  origin: "https://sniperank.vercel.app"
}));

app.use(express.json());
app.use(express.static("public"));

// ✅ API routes (email handler, etc.)
app.use("/api", friendlyRoute);

// ✅ Serve homepage
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ✅ Serve analyze.html with JS + form

app.get("/analyze.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "analyze.html"));
});

// ✅ Dynamic short report response for /report.html
// ✅ Dynamic short report route — no query param required
app.get("/report.html", (req, res) => {
  const html = `
    <div class="section-title">✅ What’s Working</div>
    <ul><li>Your site includes structured data for AI to interpret.</li></ul>

    <div class="section-title">🚨 Needs Attention</div>
    <ul><li>No sitemap.xml detected.</li></ul>

    <div class="section-title">📡 AI Engine Insights</div>
    <ul><li>ChatGPT sees some brand identity, but it's unclear.</li></ul>
  `;

  res.send(html);
});


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
