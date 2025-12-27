import Document from "../models/document.js";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {glob} from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 🔑 Resolve project root (folder that contains BOTH Backend & ai-agent)
// Backend root
const backendRoot = path.resolve(__dirname, "../..");

// ai-agent is sibling of Backend
const aiAgentDir = path.resolve(backendRoot, "../ai-agent");

export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Resolve uploads directory
    const uploadsDir =
      process.env.NODE_ENV === "production"
        ? "/tmp/uploads"
        : path.join(process.cwd(), "uploads");

    // Store relative path (important for portability)
    const relativePath = path.relative(process.cwd(), req.file.path);

    // Create document in DB with "processing" status
    const document = await Document.create({
      userId: req.user._id,
      originalName: req.file.originalname,
      filePath: relativePath,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: "processing",
    });

    // Python executable
    const pythonExecutable =
      process.env.NODE_ENV === "production"
        ? "python3"
        : path.join(aiAgentDir, "venv/bin/python");

    const scriptPath = path.join(aiAgentDir, "index_documents.py");

    // Debug logs
    console.log("Starting document processing:", {
      documentId: document._id,
      filePath: req.file.path,
      python: pythonExecutable,
      script: scriptPath,
      pythonExists:
        pythonExecutable === "python3"
          ? "system"
          : fs.existsSync(pythonExecutable),
      scriptExists: fs.existsSync(scriptPath),
    });

    // Spawn Python process
    const pythonProcess = spawn(
      pythonExecutable,
      [scriptPath, req.file.path, document._id.toString()],
      { cwd: aiAgentDir }
    );

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on("error", async (err) => {
      console.error("Python spawn error:", err);
      document.status = "failed";
      await document.save();

      return res.status(500).json({
        message: "Failed to start document processing",
        error: err.message,
      });
    });

    pythonProcess.on("close", async (code) => {
      if (code !== 0 || !output.includes("INDEXING_SUCCESS")) {
        console.error("Indexing failed:", errorOutput);

        document.status = "failed";
        await document.save();

        return res.status(500).json({
          message: "Document processing failed",
          error: errorOutput || "Unknown indexing error",
        });
      }

      // Success
      document.status = "processed";
      await document.save();

      return res.status(201).json({
        message: "Document uploaded and processed successfully",
        document: {
          _id: document._id,
          originalName: document.originalName,
          status: document.status,
        },
      });
    });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({
      message: "Upload failed",
      error: err.message,
    });
  }
};



export const getDocuments = async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Error fetching documents" });
  }
};


export const deleteDocument = async (req, res) => {

    
  try {
    const { id } = req.params;
    
    // Check if document exists
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: "Document not found" });
    }

    // Check if user owns the document
    if (document.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Delete the document from database
    await Document.findByIdAndDelete(id);

    // TODO: Delete the associated vector store files
    const vectorStorePath = path.join(
      __dirname,
      "../../ai-agent/vector_store",
      `faiss_index_${id}*`  // This will match both the index and metadata files
    );

    // Delete vector store files if they exist
    try {
      const files = glob.sync(vectorStorePath);
      for (const file of files) {
        fs.unlinkSync(file);
      }
    } catch (error) {
      console.error("Error deleting vector store files:", error);
      // Continue even if file deletion fails
    }

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ 
      message: "Error deleting document",
      error: error.message 
    });
  }
};