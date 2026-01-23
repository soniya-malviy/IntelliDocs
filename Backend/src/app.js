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

// CORS middleware - ALWAYS allow in production
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // ALWAYS set CORS headers when there's an origin header
  if (origin) {
    // In production: ALWAYS allow the request origin (no exceptions)
    // In development: allow if no restrictions or if in allowed list
    const shouldAllow = isProduction || 
                       allowedOrigins.length === 0 || 
                       allowedOrigins.includes(origin);
    
    if (shouldAllow) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Expose-Headers", "Content-Length, Content-Type");
      res.header("Access-Control-Max-Age", "86400");
    } else {
      console.warn(`⚠️ CORS: Blocking origin ${origin} in development`);
    }
  }
  
  // Handle preflight OPTIONS requests
  if (req.method === "OPTIONS") {
    // For OPTIONS, ALWAYS set headers if origin exists (especially in production)
    if (origin) {
      // Always set headers for OPTIONS in production, or if allowed
      if (isProduction || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        if (!res.getHeader("Access-Control-Allow-Origin")) {
          res.header("Access-Control-Allow-Origin", origin);
          res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
          res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
          res.header("Access-Control-Allow-Credentials", "true");
        }
      }
    }
    return res.sendStatus(204);
  }
  
  next();
});

/* ---------------- MIDDLEWARE ---------------- */
app.use(express.json());

// Response interceptor to ensure CORS headers are always set
app.use((req, res, next) => {
  const originalJson = res.json;
  const originalSend = res.send;
  const originalSendStatus = res.sendStatus;
  const origin = req.headers.origin;

  // Wrap res.json to ensure CORS headers
  res.json = function(body) {
    if (origin && !res.getHeader("Access-Control-Allow-Origin")) {
      const shouldAllow = isProduction || 
                         allowedOrigins.length === 0 || 
                         allowedOrigins.includes(origin);
      if (shouldAllow) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
      }
    }
    return originalJson.call(this, body);
  };

  // Wrap res.send to ensure CORS headers
  res.send = function(body) {
    if (origin && !res.getHeader("Access-Control-Allow-Origin")) {
      const shouldAllow = isProduction || 
                         allowedOrigins.length === 0 || 
                         allowedOrigins.includes(origin);
      if (shouldAllow) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
      }
    }
    return originalSend.call(this, body);
  };

  // Wrap res.sendStatus to ensure CORS headers
  res.sendStatus = function(statusCode) {
    if (origin && !res.getHeader("Access-Control-Allow-Origin")) {
      const shouldAllow = isProduction || 
                         allowedOrigins.length === 0 || 
                         allowedOrigins.includes(origin);
      if (shouldAllow) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
      }
    }
    return originalSendStatus.call(this, statusCode);
  };

  next();
});

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

// Error handling middleware that also sets CORS headers (MUST be after all routes)
app.use((err, req, res, next) => {
  const origin = req.headers.origin;
  let allowedOrigin = null;
  
  // Set CORS headers even on errors - use same logic as main CORS middleware
  if (origin) {
    if (isProduction && allowedOrigins.length === 0) {
      allowedOrigin = origin;
    } else if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else if (isProduction) {
      allowedOrigin = origin;
    } else {
      allowedOrigin = origin;
    }
  }
  
  if (allowedOrigin) {
    res.header("Access-Control-Allow-Origin", allowedOrigin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  
  // Handle CORS errors
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ message: err.message });
  }
  
  // Handle other errors
  console.error("Error:", err);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;
