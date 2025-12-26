import express from "express";
import cors from "cors";
import User from "./models/user.js";
import Document from "./models/document.js";
import authRoutes from "./routes/authRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import queryRoutes from "./routes/queryRoutes.js";



const app = express();

// Middleware
app.use(cors());
app.use(express.json());



app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/documents", queryRoutes);


// Test route

// app.get("/api/test-db", async (req, res) => {
//   const user = await User.create({
//     name: "Test User",
//     email: "test@example.com",
//     passwordHash: "hashed_password",
//   });

//   res.json(user);
// });

// app.get("/api/test-document", async (req, res) => {
//   // get any existing user
//   const user = await User.findOne();

//   if (!user) {
//     return res.status(400).json({ error: "No user found" });
//   }

//   const doc = await Document.create({
//     userId: user._id,
//     originalName: "sample.pdf",
//     filePath: "/uploads/sample.pdf",
//     mimeType: "application/pdf",
//     size: 102400,
//   });

//   res.json(doc);
// });
app.get("/api/health", (req, res) => {
  res.json({ status: "Server running 🚀" });
});

export default app;
