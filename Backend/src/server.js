import dotenv from "dotenv";
dotenv.config(); // ✅ MUST be first

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import app from "./app.js";
import connectDB from "./config/db.js";

/* ------------------ PATH SETUP ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ------------------ ALLOWED ORIGINS ------------------ */
const allowedOrigins = [
  "http://localhost:5173",
  "https://intelli-docs-q65vcpjh-soniya-malviyas-projects.vercel.app",
  "https://intelli-docs-ten.vercel.app",
];

/* ------------------ CORS (🔥 FIXED) ------------------ */
app.use(
  cors({
    origin: (origin, callback) => {
      // allow Postman / server-to-server
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false); // ❌ DO NOT throw error
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 🔥 THIS IS REQUIRED FOR PREFLIGHT
app.options("*", cors());

/* ------------------ DATABASE ------------------ */
connectDB();

/* ------------------ UPLOADS DIR ------------------ */
const ensureUploadsDir = () => {
  const uploadsDir =
    process.env.NODE_ENV === "production"
      ? "/tmp/uploads"
      : path.join(__dirname, "..", "uploads");

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Created uploads directory at: ${uploadsDir}`);
  }
};

ensureUploadsDir();

/* ------------------ START SERVER ------------------ */
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
