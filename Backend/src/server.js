import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import cors from "cors";
app.use(cors({
  origin: "http://localhost:5173", // Your frontend URL
  credentials: true
}));
dotenv.config();

// Connect database
connectDB();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
