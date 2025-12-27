import multer from "multer";
import path from "path";
import fs from "fs";

/* ---------------- UPLOAD DIRECTORY ---------------- */

export const uploadsDir =
  process.env.NODE_ENV === "production"
    ? "/tmp/uploads"
    : path.join(process.cwd(), "uploads");

// Ensure uploads directory exists once
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📁 Uploads directory ready: ${uploadsDir}`);
}

/* ---------------- STORAGE CONFIG ---------------- */

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9.-]/g, "");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

/* ---------------- FILE FILTER ---------------- */

const fileFilter = (_req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

/* ---------------- MULTER INSTANCE ---------------- */

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

export default upload;
