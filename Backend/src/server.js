import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

/* ---------- PATH ---------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- KEEP-ALIVE RELOADER ---------- */
const url = process.env.RENDER_URL || "http://localhost:5001";
const interval = 60000; // 30 seconds

// Reloader Function
function reloadWebsite() {
  axios.get(url)
    .then(response => {
      console.log(`Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    })
    .catch(error => {
      console.error(`Error reloading at ${new Date().toISOString()}:`, error.message);
    });
}

setInterval(reloadWebsite, interval);

/* ---------- DB ---------- */
connectDB();

/* ---------- UPLOADS ---------- */
const uploadsDir =
  process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* ---------- START SERVER ---------- */
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
