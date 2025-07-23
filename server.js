// server.js — Fixed version with analyze.html route
// // Force deploy 12:47 PM

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import friendlyRoute from "./api/friendly.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Needed when using ES modules with __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({
  origin: "https://sniperank.vercel.app"
}));
app.use(express.json());
app.use(express.static("public"));

app.use("/api", friendlyRoute);

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// ✅ Add this route to explicitly serve analyze.html
app.get("/analyze.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "analyze.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
