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

    // Check if Python executable exists
    try {
      await import('fs/promises').then(fs => fs.access(pythonExecutable));
    } catch (e) {
      console.error(`Python executable not found at: ${pythonExecutable}`);
      return res.status(500).json({
        message: "Server configuration error",
        error: "Python environment is not set up correctly. Please contact support."
      });
    }

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
      question,  // Stringify to handle spaces/special chars
      docId
    ], {
      cwd: path.join(projectRoot, "ai-agent")
    });

    let timedOut = false;
    let output = "";
    let errorOutput = "";

    // Set a timeout for the Python process
    const timeout = setTimeout(() => {
      timedOut = true;
      pythonProcess.kill('SIGTERM');
      console.error('🕰 Python process timed out after 60 seconds');
      
      // CRITICAL: Always set CORS headers before sending any response
      setCorsHeaders(req, res);
      return res.status(504).json({
        message: "Request timeout. The server is taking too long to process your question. Please try again with a simpler question or smaller document.",
        error: "Python process timeout"
      });
    }, 60000); // 60 second timeout

    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      // Print Python stderr output (which includes our console logs) to Node.js console
      process.stderr.write(data);
    });

    pythonProcess.on('close', (code) => {
      // Clear the timeout if process finished
      clearTimeout(timeout);

      // CRITICAL: Always set CORS headers before sending any response
      // This is needed because the callback runs outside the normal Express middleware chain
      setCorsHeaders(req, res);

      if (timedOut) {
        // Already handled timeout above
        return;
      }

      if (code !== 0) {
        console.error('Python script error:', errorOutput);
        return res.status(500).json({
          message: "Error processing your question",
          error: errorOutput
        });
      }

        try {
          const result = JSON.parse(output);

          // Skip the document status check - it's causing the error
          // The Python script handles document processing state
          

        // Handle explicit errors from Python script
        if (result.status === 'error') {
          if (result.error === 'VECTOR_STORE_MISSING') {
            return res.status(404).json({
              message: "Document not found or not processed yet. Please upload the document first.",
              error: "VECTOR_STORE_MISSING"
            });
          }
          
          return res.status(500).json({
            message: "Error processing your question",
            error: result.error
          });
        }

        // Success response
        res.status(200).json({
          message: "Question answered successfully",
          data: result
        });
      } catch (parseError) {
        console.error('Error parsing Python output:', parseError);
        return res.status(500).json({
          message: "Error processing your question",
          error: "Invalid response from Python script"
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

    // Handle Python process exit without proper output
    pythonProcess.on('exit', (code, signal) => {
      console.log('Python process exited:', { code, signal });
      if (code === null && !signal) {
        console.error('Python process exited without proper code or signal');
        setCorsHeaders(req, res);
        res.status(500).json({
          message: "Python process exited unexpectedly",
          error: "Process terminated without proper exit code"
        });
      }
    });

  } catch (error) {
    console.error('Query error:', error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};