import express from "express";
import { register, login } from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import {getMe} from "../controllers/authController.js";
const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/me", protect, getMe);

export default router;
