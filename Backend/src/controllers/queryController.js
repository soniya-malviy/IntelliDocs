import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');

export const queryDocument = async (req, res) => {
  try {
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

    console.log('Running query with:', {
      python: pythonExecutable,
      script: scriptPath,
      question: question.substring(0, 50) + '...',
      docId
    });

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
    });

    pythonProcess.on('close', (code) => {
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
        res.status(500).json({
          message: "Error processing the response",
          error: error.message
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