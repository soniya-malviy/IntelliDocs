import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";
import path from "path";

import dotenv from "dotenv";
dotenv.config();

const app = express();

dotenv.config({ path: path.resolve(process.cwd(), '.env') });



const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : [];

console.log("cors", process.env.CORS_ORIGINS);

app.use(cors({
  origin: (origin, callback) => {
    // allow server-to-server, curl, postman
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

/* ---------- BODY PARSER ---------- */
app.use(express.json());

/* ---------- ROUTES ---------- */
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/documents", queryRoutes);

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "Server running 🚀",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Test endpoint for CORS
app.get("/api/test-cors", (req, res) => {
  res.json({ 
    message: "CORS is working!",
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
});

export default app;