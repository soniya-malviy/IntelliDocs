import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 10000, // 10 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
    };

    await mongoose.connect(process.env.db_url, options);
    console.log("✅ MongoDB Connected");
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error("❌ MongoDB Connection Error:", err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn("⚠️ MongoDB Disconnected");
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log("✅ MongoDB Reconnected");
    });
  } catch (error) {
    console.error("❌ MongoDB Connection Failed:", error.message);
    // Don't exit in production - let the server start and retry
    if (process.env.NODE_ENV === "production") {
      console.warn("⚠️ Continuing without database connection - will retry on first request");
    } else {
      process.exit(1);
    }
  }
};

export default connectDB;
