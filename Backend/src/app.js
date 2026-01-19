import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";

/* ---------------- ENV ---------------- */
dotenv.config();

const app = express();

/* ---------------- CORS ---------------- */
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(o => o.trim())
  : [];

// In production, allow all origins if CORS_ORIGINS is not set
const isProduction = process.env.NODE_ENV === "production";

console.log("✅ CORS Configuration:", {
  environment: process.env.NODE_ENV,
  allowedOrigins: allowedOrigins.length > 0 ? allowedOrigins : "ALL (production mode)",
});

// Custom CORS middleware that always sets headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Determine allowed origin
  // Note: When credentials: true, we CANNOT use "*" - must use specific origin
  let allowedOrigin = null;
  
  if (origin) {
    // In production, allow all origins if CORS_ORIGINS is not configured
    if (isProduction && allowedOrigins.length === 0) {
      allowedOrigin = origin; // Always use the request origin
    } 
    // If CORS_ORIGINS is configured, check against the list
    else if (allowedOrigins.length > 0) {
      if (allowedOrigins.includes(origin)) {
        allowedOrigin = origin;
      } else {
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        // In production, still allow but log warning
        if (isProduction) {
          allowedOrigin = origin;
        }
      }
    } 
    // Default: allow all in production
    else if (isProduction) {
      allowedOrigin = origin;
    }
    // Development: allow all origins
    else {
      allowedOrigin = origin;
    }
  }
  
  // Always set CORS headers for all requests (including no-origin requests)
  if (allowedOrigin) {
    res.header("Access-Control-Allow-Origin", allowedOrigin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Expose-Headers", "Content-Length, Content-Type");
  res.header("Access-Control-Max-Age", "86400");
  
  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  
  next();
});


/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());

// Database connection check middleware
app.use((req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    // Try to reconnect if disconnected
    if (mongoose.connection.readyState === 0) {
      connectDB().catch(console.error);
    }
  }
  next();
});

/* ---------------- ROUTES ---------------- */
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/documents", queryRoutes);

/* ---------------- HEALTH ---------------- */
app.get("/api/health", (req, res) => {
  res.json({
    status: "Server running 🚀",
    env: process.env.NODE_ENV,
    time: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

export default app;
