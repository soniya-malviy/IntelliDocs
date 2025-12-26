import dotenv from "dotenv";
dotenv.config(); // ✅ MUST be first

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import app from "./app.js";
import connectDB from "./config/db.js";

/* ------------------ PATH SETUP ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url} from origin: ${req.headers.origin || 'no origin'}`);
  next();
});

// PERMISSIVE CORS MIDDLEWARE
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Expose-Headers", "Content-Length, Content-Type, Authorization");
  res.header("Access-Control-Max-Age", "86400"); // 24 hours
  
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    console.log("🛬 Handling OPTIONS preflight request");
    return res.status(200).end();
  }
  
  next();
});

// Also use cors package as backup
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: "*",
  exposedHeaders: "*"
}));

/* ------------------ DATABASE ------------------ */
connectDB();

/* ------------------ UPLOADS DIR ------------------ */
const ensureUploadsDir = () => {
  const uploadsDir = process.env.NODE_ENV === "production"
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
  console.log(`🌐 CORS: ALL origins allowed (*)`);
  console.log(`📡 Accessible at: http://localhost:${PORT}`);
  
});