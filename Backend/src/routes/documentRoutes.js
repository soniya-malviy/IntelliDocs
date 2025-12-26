import express from "express";
import upload from "../config/multer.js";
import protect from "../middleware/authMiddleware.js";
import { uploadDocument, getDocuments, deleteDocument } from "../controllers/documentController.js";

const router = express.Router();

router.post(
  "/upload",
  protect,
  upload.single("file"),
  uploadDocument
);

router.get("/", protect, getDocuments);


// ... existing routes ...

router.delete("/:id", protect, deleteDocument);

export default router;
