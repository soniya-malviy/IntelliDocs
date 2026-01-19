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

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) {
        return callback(null, true);
      }

      // In production, allow all origins if CORS_ORIGINS is not configured
      if (isProduction && allowedOrigins.length === 0) {
        return callback(null, true);
      }

      // If CORS_ORIGINS is configured, check against the list
      if (allowedOrigins.length > 0) {
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        // Log blocked origin for debugging
        console.warn(`⚠️ CORS blocked origin: ${origin}`);
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      }

      // Default: allow all in production, restrict in development
      if (isProduction) {
        return callback(null, true);
      }

      // Development: allow localhost origins
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        return callback(null, true);
      }

      return callback(null, true); // Allow by default
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: ["Content-Length", "Content-Type"],
    maxAge: 86400, // 24 hours
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Handle preflight requests explicitly (Express 5 compatible)
// Use middleware approach instead of route handler
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin;
    
    // Use the same origin logic as CORS middleware
    if (isProduction && allowedOrigins.length === 0) {
      res.header("Access-Control-Allow-Origin", origin || "*");
    } else if (allowedOrigins.length > 0 && origin && allowedOrigins.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
    } else if (isProduction) {
      res.header("Access-Control-Allow-Origin", origin || "*");
    } else {
      res.header("Access-Control-Allow-Origin", origin || "*");
    }
    
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Max-Age", "86400");
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
