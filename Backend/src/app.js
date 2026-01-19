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

console.log("✅ Allowed CORS Origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server, curl, Postman
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`❌ CORS blocked for origin: ${origin}`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Correct preflight handler (Node 20 safe)


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
