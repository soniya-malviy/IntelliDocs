// FileUpload.jsx - Simplified
import React from "react";
import { useState } from "react";
import { Upload, Loader2, FileText } from "lucide-react";
import api from "../api/axios";

export default function FileUpload({ onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // In FileUpload.jsx
const uploadFile = async () => {
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  

  try {
    setLoading(true);
    const res = await api.post("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    
    if (res.data && res.data.document && res.data.document._id) {
      onUploadSuccess(res.data.document._id);
      setFile(null);
      document.querySelector('input[type="file"]').value = "";
      // Show success message
      alert("Document uploaded successfully!");
    } else {
      throw new Error("Invalid response format from server");
    }
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    alert(
      err.response?.data?.message ||
      "Failed to upload document. Please try again."
    );
  } finally {
    setLoading(false);
  }
};
  return (
  <div className="bg-gray-800 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700">
  <div className="flex items-center gap-3 mb-4 sm:mb-6">
    <div className="p-2 bg-blue-900/30 rounded-lg">
      <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
    </div>
    <div>
      <h2 className="text-lg sm:text-xl font-semibold text-white">Upload Document</h2>
      <p className="text-xs sm:text-sm text-gray-400">Upload PDF files for analysis</p>
    </div>
  </div>

  <div className="mb-4 sm:mb-6">
    <label className="block mb-2 text-sm font-medium text-gray-300">
      Select PDF File
    </label>
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
      <div className="flex-1 w-full">
        <div className="relative">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0])}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col sm:flex-row sm:items-center justify-between w-full p-3 sm:p-4 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors bg-gray-900/50"
          >
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-300 truncate">
                  {file ? file.name : "Choose a PDF file"}
                </p>
                <p className="text-xs text-gray-500">
                  {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Max 10MB"}
                </p>
              </div>
            </div>
            <span className="w-full sm:w-auto px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-center">
              Browse
            </span>
          </label>
        </div>
      </div>
      <button
        onClick={uploadFile}
        disabled={loading || !file}
        className="w-full sm:w-auto px-4 sm:px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4" />
            <span className="hidden xs:inline">Upload</span>
          </>
        )}
      </button>
    </div>
  </div>

  <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-gray-900/30 rounded-lg border border-gray-700">
    <h3 className="text-sm font-medium text-gray-300 mb-2">Note</h3>
    <p className="text-xs sm:text-sm text-gray-400">
      Uploaded documents will be saved permanently and can be accessed from the Documents tab.
      Chat history for each document is saved in your browser's local storage.
    </p>
  </div>
</div>
  );
}