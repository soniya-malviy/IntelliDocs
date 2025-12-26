// In Backend/src/config/multer.js
import multer from "multer";
import path from "path";
import fs from "fs";

// Use /tmp for production (ephemeral storage) and 'uploads' for development
const uploadsDir = process.env.NODE_ENV === 'production' 
  ? '/tmp/uploads' 
  : path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
const ensureUploadsDir = () => {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`📁 Created uploads directory at: ${uploadsDir}`);
  }
};

// Initialize uploads directory
ensureUploadsDir();

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadsDir(); // Ensure directory exists on each upload
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    cb(null, uniqueName);
  },
});

// File filter (PDF only)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

// Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export default upload;