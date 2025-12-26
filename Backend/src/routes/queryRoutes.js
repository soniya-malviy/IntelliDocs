import express from "express";
import protect from "../middleware/authMiddleware.js";
import { queryDocument } from "../controllers/queryController.js";

const router = express.Router();

router.post("/query", protect, queryDocument);

export default router;
