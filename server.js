// server.js — Fixed version with friendlyRoute import (June 23)

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import friendlyRoute from "./api/friendly.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.use("/api", friendlyRoute);

app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
