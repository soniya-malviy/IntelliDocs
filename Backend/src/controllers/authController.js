import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// REGISTER
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // Check existing user - use lean() for faster queries
    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    // Handle database connection errors
    if (error.name === "MongoNetworkError" || error.name === "MongoTimeoutError") {
      return res.status(503).json({ 
        message: "Database connection error. Please try again." 
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      message: "Registration failed. Please try again." 
    });
  }
};

// LOGIN
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user - use lean() for faster queries
    const user = await User.findOne({ email }).lean();

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    
    // Handle database connection errors
    if (error.name === "MongoNetworkError" || error.name === "MongoTimeoutError") {
      return res.status(503).json({ 
        message: "Database connection error. Please try again." 
      });
    }
    
    // Handle other errors
    res.status(500).json({ 
      message: "Login failed. Please try again." 
    });
  }
};

export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

