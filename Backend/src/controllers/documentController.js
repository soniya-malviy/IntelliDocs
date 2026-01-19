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

// Helper function to process document asynchronously
const processDocumentAsync = async (filePath, documentId, pythonExecutable, scriptPath, aiAgentDir) => {
  return new Promise((resolve, reject) => {
    console.log("Starting document processing:", {
      documentId: documentId,
      filePath: filePath,
      python: pythonExecutable,
      script: scriptPath,
    });

    // Spawn Python process
    const pythonProcess = spawn(
      pythonExecutable,
      [scriptPath, filePath, documentId.toString()],
      { cwd: aiAgentDir }
    );

    let output = "";
    let errorOutput = "";

    pythonProcess.stdout.on("data", (data) => {
      output += data.toString();
      console.log(`[Python stdout] ${data.toString()}`);
    });

    pythonProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
      console.error(`[Python stderr] ${data.toString()}`);
    });

    pythonProcess.on("error", (err) => {
      console.error("Python spawn error:", err);
      reject(err);
    });

    pythonProcess.on("close", async (code) => {
      try {
        const document = await Document.findById(documentId);
        if (!document) {
          console.error(`Document ${documentId} not found during processing`);
          return reject(new Error("Document not found"));
        }

        if (code !== 0 || !output.includes("INDEXING_SUCCESS")) {
          console.error("Indexing failed:", {
            code,
            output,
            errorOutput
          });

          document.status = "failed";
          await document.save();
          reject(new Error(errorOutput || "Unknown indexing error"));
        } else {
          // Success
          document.status = "processed";
          await document.save();
          console.log(`✅ Document ${documentId} processed successfully`);
          resolve();
        }
      } catch (err) {
        console.error("Error updating document status:", err);
        reject(err);
      }
    });
  });
};

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

    // Store absolute path for Python script (more reliable in production)
    const absoluteFilePath = req.file.path;

    // Verify file exists
    if (!fs.existsSync(absoluteFilePath)) {
      return res.status(500).json({
        message: "Uploaded file not found",
        error: "File was uploaded but cannot be located",
      });
    }

    // Create document in DB with "processing" status
    const document = await Document.create({
      userId: req.user._id,
      originalName: req.file.originalname,
      filePath: path.relative(process.cwd(), absoluteFilePath),
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: "processing",
    });

    console.log(`📄 Document created: ${document._id}, file: ${absoluteFilePath}`);

    // Python executable
    const pythonExecutable =
      process.env.NODE_ENV === "production"
        ? "python3"
        : path.join(aiAgentDir, "venv/bin/python");

    const scriptPath = path.join(aiAgentDir, "index_documents.py");

    // Log paths for debugging
    console.log("Upload configuration:", {
      uploadsDir,
      absoluteFilePath,
      aiAgentDir: aiAgentDir,
      pythonExecutable,
      scriptPath,
      fileExists: fs.existsSync(absoluteFilePath),
      aiAgentDirExists: fs.existsSync(aiAgentDir),
      scriptExists: fs.existsSync(scriptPath),
    });

    // Check if Python and script exist
    if (pythonExecutable !== "python3" && !fs.existsSync(pythonExecutable)) {
      console.error(`❌ Python executable not found: ${pythonExecutable}`);
      document.status = "failed";
      await document.save();
      return res.status(500).json({
        message: "Python environment not configured",
        error: "Python executable not found",
      });
    }

    if (!fs.existsSync(aiAgentDir)) {
      console.error(`❌ AI agent directory not found: ${aiAgentDir}`);
      document.status = "failed";
      await document.save();
      return res.status(500).json({
        message: "AI agent directory not found",
        error: "ai-agent directory not accessible",
      });
    }

    if (!fs.existsSync(scriptPath)) {
      console.error(`❌ Python script not found: ${scriptPath}`);
      document.status = "failed";
      await document.save();
      return res.status(500).json({
        message: "Indexing script not found",
        error: "index_documents.py not found",
      });
    }

    // Send immediate response - processing happens in background
    res.status(201).json({
      message: "Document uploaded successfully. Processing in background...",
      document: {
        _id: document._id,
        originalName: document.originalName,
        status: document.status,
      },
    });

    // Process document asynchronously (don't await - let it run in background)
    // Use setImmediate to ensure response is sent before starting background processing
    setImmediate(() => {
      processDocumentAsync(
        absoluteFilePath,
        document._id,
        pythonExecutable,
        scriptPath,
        aiAgentDir
      ).catch((error) => {
        console.error(`❌ Background processing failed for document ${document._id}:`, error);
        // Error already logged and document status updated in processDocumentAsync
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