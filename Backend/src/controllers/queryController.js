import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

// Helper function to ensure CORS headers are set before sending response
const setCorsHeaders = (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Origin");
    res.header("Access-Control-Allow-Credentials", "true");
  }
};

export const queryDocument = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: "Authentication required",
        error: "User not authenticated",
      });
    }

    const { question, docId } = req.body;

    if (!question || !docId) {
      return res.status(400).json({
        message: "Question and document ID are required"
      });
    }
    

    const pythonExecutable = path.join(
      projectRoot,
      "ai-agent/venv/bin/python"
    );

    const scriptPath = path.join(
      projectRoot,
      "ai-agent/query_rag.py"
    );

    console.log('\n========================================');
    console.log('🔍 QUERY REQUEST RECEIVED');
    console.log('========================================');
    console.log('📝 Question:', question);
    console.log('📚 Document ID:', docId);
    console.log('🐍 Python executable:', pythonExecutable);
    console.log('📄 Script path:', scriptPath);
    console.log('========================================\n');

    const pythonProcess = spawn(pythonExecutable, [
      scriptPath,
      JSON.stringify(question),  // Stringify to handle spaces/special chars
      docId
    ], {
      cwd: projectRoot
    });

    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // Print Python stderr output (which includes our console logs) to Node.js console
      process.stderr.write(data);
    });

    pythonProcess.on('close', (code) => {
      // CRITICAL: Always set CORS headers before sending any response
      // This is needed because the callback runs outside the normal Express middleware chain
      setCorsHeaders(req, res);

      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        return res.status(500).json({
          message: "Error processing your question",
          error: errorOutput
        });
      }

      try {
        const result = JSON.parse(output);
        if (result.status === 'error') {
          throw new Error(result.error);
        }
        res.json(result);
      } catch (error) {
        console.error('Error parsing Python output:', error);
        // Ensure CORS headers are set even on parsing errors
        setCorsHeaders(req, res);
        res.status(500).json({
          message: "Error processing the response",
          error: error.message
        });
      }
    });

    // Handle Python process errors
    pythonProcess.on('error', (error) => {
      console.error('Python process spawn error:', error);
      // Ensure CORS headers are set even on spawn errors
      setCorsHeaders(req, res);
      res.status(500).json({
        message: "Failed to start Python process",
        error: error.message
      });
    });

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};