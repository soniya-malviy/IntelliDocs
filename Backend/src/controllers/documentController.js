import Document from "../models/document.js";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

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

    // Store file path and document ID before deleting from database
    const filePath = document.filePath;
    const docId = document._id.toString(); // Convert ObjectId to string for file matching
    const deletionErrors = [];

    // Delete the document from database
    await Document.findByIdAndDelete(id);

    // 1. Delete the actual PDF file from filesystem
    try {
      // Resolve uploads directory (same logic as upload)
      const uploadsDir =
        process.env.NODE_ENV === "production"
          ? "/tmp/uploads"
          : path.join(process.cwd(), "uploads");

      let fullFilePath;
      
      // filePath is stored as relative path from process.cwd()
      // Try multiple possible locations
      const possiblePaths = [
        path.join(process.cwd(), filePath),           // Relative to cwd
        path.resolve(filePath),                       // Absolute path
        path.join(uploadsDir, path.basename(filePath)), // Just filename in uploads
        filePath                                      // As-is
      ];

      // Find the first existing file
      fullFilePath = possiblePaths.find(p => fs.existsSync(p));

      if (fullFilePath && fs.existsSync(fullFilePath)) {
        fs.unlinkSync(fullFilePath);
        console.log(`✅ Deleted PDF file: ${fullFilePath}`);
      } else {
        console.warn(`⚠️ PDF file not found. Tried: ${possiblePaths.join(", ")}`);
      }
    } catch (error) {
      console.error("Error deleting PDF file:", error);
      deletionErrors.push(`PDF file: ${error.message}`);
      // Continue even if file deletion fails
    }

    // 2. Delete the associated vector store files
    try {
      const vectorStoreDir = path.join(aiAgentDir, "vector_store");
      
      // Check if vector store directory exists
      if (!fs.existsSync(vectorStoreDir)) {
        console.log(`ℹ️ Vector store directory not found: ${vectorStoreDir}`);
      } else {
        // Pattern to match both index and metadata files
        // Use docId (converted to string) to match the file naming convention
        const indexPattern = `faiss_index_${docId}`;
        const metaPattern = `faiss_index_${docId}_meta.pkl`;
        
        // Get all files in vector_store directory
        const allFiles = fs.readdirSync(vectorStoreDir);
        
        // Find and delete matching files (index file and metadata file)
        const filesToDelete = allFiles.filter(file => 
          file === indexPattern || file === metaPattern || file.startsWith(indexPattern)
        );

        let deletedCount = 0;
        for (const file of filesToDelete) {
          const filePath = path.join(vectorStoreDir, file);
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`✅ Deleted vector store file: ${file}`);
              deletedCount++;
            }
          } catch (fileError) {
            console.error(`Error deleting vector store file ${file}:`, fileError);
            deletionErrors.push(`Vector store file ${file}: ${fileError.message}`);
          }
        }

        if (deletedCount === 0) {
          console.log(`ℹ️ No vector store files found for document ${docId}`);
        } else {
          console.log(`✅ Deleted ${deletedCount} vector store file(s) for document ${docId}`);
        }
      }
    } catch (error) {
      console.error("Error deleting vector store files:", error);
      deletionErrors.push(`Vector store: ${error.message}`);
      // Continue even if file deletion fails
    }

    // Return success response (even if some file deletions failed)
    if (deletionErrors.length > 0) {
      console.warn("Some files could not be deleted:", deletionErrors);
      return res.json({ 
        message: "Document deleted successfully, but some files could not be removed",
        warnings: deletionErrors
      });
    }

    res.json({ message: "Document and all associated files deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ 
      message: "Error deleting document",
      error: error.message 
    });
  }
};