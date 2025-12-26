import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const allowedOrigins = [
  "http://localhost:5173", // local dev
  "https://intelli-docs-q65vcpjh-soniya-malviyas-projects.vercel.app", // vercel
  "https://intelli-docs-ten.vercel.app" // (if you have another)
];

app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (Postman, curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

dotenv.config();

// Connect database
connectDB();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Ensure uploads directory exists
const ensureUploadsDir = () => {
  const uploadsDir = process.env.NODE_ENV === 'production'
    ? '/tmp/uploads'
    : path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Created uploads directory at: ${uploadsDir}`);
  }
};
// Call this before starting the server
ensureUploadsDir();
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
