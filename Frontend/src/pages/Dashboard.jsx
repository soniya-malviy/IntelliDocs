// Dashboard.jsx - Updated with persistent data
import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import ChatBox from "../components/ChatBox";
import { LogOut, Menu, X, Home, FileText, Settings, User, Bell, HelpCircle, Upload, Trash2, Eye } from "lucide-react";
import api from "../api/axios";
import { use } from "react";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [nameuser, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatHistory, setChatHistory] = useState(() => {
    // Load chat history from localStorage on initial render
    const saved = localStorage.getItem("chatHistory");
    return saved ? JSON.parse(saved) : [];
  });

  const menuItems = [
    { id: "chat", label: "Chat", icon: Home },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "upload", label: "Upload", icon: Upload },
  ];



  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch (error) {
        console.error("Failed to load user", error);
      }
    };

    fetchUser();
  }, []);

  // Fetch documents from backend on component mount
  useEffect(() => {
    fetchDocuments();
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("chatHistory", JSON.stringify(chatHistory));
  }, [chatHistory]);

  useEffect(() => {
  const loadDocuments = async () => {
    try {
      const response = await api.get('/documents');
      setDocuments(response.data);
      
      // If there's a document ID in the URL, use it
      const urlParams = new URLSearchParams(window.location.search);
      const docId = urlParams.get('docId');
      
      if (docId && response.data.some(doc => doc._id === docId)) {
        setSelectedDocumentId(docId);
      } else if (response.data.length > 0) {
        setSelectedDocumentId(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  loadDocuments();
}, []);
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.get("/documents");
      setDocuments(response.data);
      
      // Select the first document by default if none is selected
      if (response.data.length > 0 && !selectedDocumentId) {
        setSelectedDocumentId(response.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (documentId) => {
  // Update URL with the new document ID
  const url = new URL(window.location);
  url.searchParams.set('docId', documentId);
  window.history.pushState({}, '', url);
  
  // Refresh documents and select the new one
  fetchDocuments().then(() => {
    setSelectedDocumentId(documentId);
    setActiveTab("chat");
  });
};

 const handleDeleteDocument = async (documentId, e) => {
  e.stopPropagation(); // Prevent event bubbling
  
  if (!window.confirm("Are you sure you want to delete this document?")) {
    return;
  }

  try {
    await api.delete(`/documents/${documentId}`);
    
    // Update UI
    setDocuments(prev => {
      const newDocs = prev.filter(doc => doc._id !== documentId);
      // If the deleted document was selected, select another one
      if (selectedDocumentId === documentId) {
        setSelectedDocumentId(newDocs.length > 0 ? newDocs[0]._id : null);
      }
      return newDocs;
    });
    
    // Clear chat history for this document
    setChatHistory(prev => {
      const newHistory = { ...prev };
      delete newHistory[documentId];
      return newHistory;
    });

  } catch (error) {
    console.error("Error deleting document:", error);
    alert(error.response?.data?.message || "Failed to delete document");
  }
};

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 to-black text-gray-200">
      {/* Mobile Header */}
      <div className="lg:hidden bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
         
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-50
          transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 transition-transform duration-300 ease-in-out
          w-64 bg-gray-800/90 backdrop-blur-lg border-r border-gray-700
          lg:bg-gray-800/50 lg:backdrop-blur-sm
        `}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">IntelliDocs</h1>
                  <p className="text-xs text-gray-400">Document Assistant</p>
                </div>
              </div>
            </div>

          

            {/* Navigation */}
            <nav className="flex-1 p-4">
              <ul className="space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setActiveTab(item.id)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-3 rounded-xl
                          transition-all duration-200
                          ${activeTab === item.id
                            ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border-l-4 border-blue-500'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                          }
                        `}
                      >
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Selected Document Info (if any) */}
            {selectedDocumentId && documents.find(d => d._id === selectedDocumentId) && (
              <div className="p-4 border-t border-gray-700">
                <p className="text-xs text-gray-400 mb-2">Currently viewing:</p>
                <div className="p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                  <p className="text-sm font-medium text-white truncate">
                    {documents.find(d => d._id === selectedDocumentId)?.filename}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatFileSize(documents.find(d => d._id === selectedDocumentId)?.size || 0)}
                  </p>
                </div>
              </div>
            )}

              {/* User Profile */}
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-white">{nameuser?.name || "User"}</h3>
                  {/* <p className="text-sm text-gray-400">{nameuser?.email || "user@example.com"}</p> */}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-700">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 lg:hidden z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Top Bar */}
          <header className="hidden lg:flex items-center justify-between p-6 border-b border-gray-800">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {activeTab === "chat" && "AI Chat Assistant"}
                {activeTab === "documents" && "My Documents"}
                {activeTab === "upload" && "Upload Documents"}
              </h1>
              <p className="text-gray-400">
                {activeTab === "chat" && selectedDocumentId 
                  ? `Chatting with: ${documents.find(d => d._id === selectedDocumentId)?.filename || "Document"}`
                  : activeTab === "chat" 
                  ? "Select a document to start chatting" 
                  : ""}
                {activeTab === "documents" && "Manage and view your uploaded files"}
                {activeTab === "upload" && "Upload new PDF documents for analysis"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors relative">
                <Bell className="w-6 h-6" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
              <button className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
                <HelpCircle className="w-6 h-6" />
              </button>
            </div>
          </header>

          {/* Content Area - Fixed height container */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full p-4 lg:p-6">
              {activeTab === "chat" && (
                <div className="h-full">
                  <ChatBox 
                    selectedDocumentId={selectedDocumentId}
                    chatHistory={chatHistory}
                    setChatHistory={setChatHistory}
                  />
                </div>
              )}

              {activeTab === "upload" && (
                <div className="h-full flex items-center justify-center">
                  <div className="w-full max-w-4xl">
                    <FileUpload onUploadSuccess={handleUploadSuccess} />
                  </div>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="h-full">
                  <div className="w-full max-w-6xl mx-auto">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-xl font-semibold text-white">My Documents</h2>
                          <p className="text-gray-400">All uploaded PDF files</p>
                        </div>
                        <button 
                          onClick={() => setActiveTab("upload")}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                        >
                          Upload New
                        </button>
                      </div>

                      {loading ? (
                        <div className="text-center py-12">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                          <p className="text-gray-400">Loading documents...</p>
                        </div>
                      ) : documents.length === 0 ? (
                        <div className="text-center py-12">
                          <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-400 mb-2">No documents yet</h3>
                          <p className="text-gray-500 mb-6">Upload your first PDF to get started</p>
                          <button 
                            onClick={() => setActiveTab("upload")}
                            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                          >
                            Upload Document
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {documents.map((doc) => (
                            <div 
                              key={doc._id} 
                              className={`p-4 rounded-xl border ${selectedDocumentId === doc._id ? 'border-blue-500 bg-blue-900/10' : 'border-gray-700 bg-gray-900/50'} hover:border-blue-400 transition-colors`}
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <FileText className="w-8 h-8 text-blue-400" />
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-white truncate">{doc.filename}</h3>
                                    <p className="text-xs text-gray-400">{formatFileSize(doc.size)}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteDocument(doc._id, e)}
                                  className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                              
                              <p className="text-xs text-gray-500 mb-3">
                                Uploaded: {formatDate(doc.uploadDate)}
                              </p>
                              
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedDocumentId(doc._id);
                                    setActiveTab("chat");
                                  }}
                                  className="flex-1 px-3 py-1.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all"
                                >
                                  Chat with this
                                </button>
                                <button
                                  onClick={() => setSelectedDocumentId(doc._id)}
                                  className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                                >
                                  Select
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}