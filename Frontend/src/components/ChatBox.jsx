// ChatBox.jsx - Updated with persistent chat
import React from "react";
import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, Copy, CheckCircle, RefreshCw, ChevronDown } from "lucide-react";
import api from "../api/axios";

export default function ChatBox({ selectedDocumentId, chatHistory = [], setChatHistory }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Load messages for selected document when it changes
 useEffect(() => {
  // Load messages from localStorage for the selected document
  if (selectedDocumentId) {
    const savedMessages = localStorage.getItem(`chat_${selectedDocumentId}`);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    } else {
      setMessages([]);
    }
  }
}, [selectedDocumentId]);

// Save messages to localStorage whenever they change
useEffect(() => {
  if (selectedDocumentId && messages.length > 0) {
    localStorage.setItem(`chat_${selectedDocumentId}`, JSON.stringify(messages));
  }
}, [messages, selectedDocumentId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Check if user has scrolled up
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const askQuestion = async () => {
    if (!question.trim()) return;

    if (!selectedDocumentId) {
      alert("Please select a document first");
      return;
    }

    // Add user message to state
    const userMessage = { type: "user", text: question, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    // Save to chat history
    setChatHistory(prev => ({
      ...prev,
      [selectedDocumentId]: updatedMessages
    }));

    try {
      setLoading(true);
      const res = await api.post("/documents/query", {
        question,
        docId: selectedDocumentId,
      });

      // Add bot response
      const botMessage = { 
        type: "bot", 
        data: res.data, 
        timestamp: new Date().toISOString() 
      };
      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);

      // Save to chat history
      setChatHistory(prev => ({
        ...prev,
        [selectedDocumentId]: finalMessages
      }));

    } catch (error) {
      // Don't log 401 errors - they're handled by axios interceptor
      if (error.response?.status !== 401) {
        console.error("Error asking question:", error);
        // Add error message
        const errorMessage = { 
          type: "bot", 
          data: { 
            answer: "Sorry, I couldn't process your request. Please try again.",
            sources: []
          }, 
          timestamp: new Date().toISOString() 
        };
        const errorMessages = [...updatedMessages, errorMessage];
        setMessages(errorMessages);
        
        setChatHistory(prev => ({
          ...prev,
          [selectedDocumentId]: errorMessages
        }));
      }
    } finally {
      setLoading(false);
      setQuestion("");
    }
  };

  const clearChat = () => {
    if (window.confirm("Clear chat history for this document?")) {
      setMessages([]);
      setChatHistory(prev => {
        const newHistory = { ...prev };
        delete newHistory[selectedDocumentId];
        return newHistory;
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
  <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 to-black rounded-xl overflow-hidden border border-gray-800">
  {/* Header - Fixed */}
  <div className="flex-shrink-0 bg-gray-800/50 px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-700 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600">
        <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
      </div>
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold text-white truncate">AI Document Assistant</h2>
        <p className="text-xs sm:text-sm text-gray-400 truncate">Ask questions about your uploaded documents</p>
      </div>
    </div>
    {messages.length > 0 && (
      <button
        onClick={clearChat}
        className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
      >
        <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
        <span className="hidden xs:inline">Clear Chat</span>
      </button>
    )}
  </div>

  {/* Messages Container - Scrollable */}
  <div 
    ref={messagesContainerRef}
    className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-gray-900 to-gray-950 min-h-0 scroll-smooth relative"
  >
    {messages.length === 0 ? (
      <div className="h-full flex flex-col items-center justify-center text-center p-4 sm:p-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center rounded-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700 mb-4 sm:mb-6">
          <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400" />
        </div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2 sm:mb-3">Welcome!</h3>
        <p className="text-sm sm:text-base text-gray-400 max-w-md mb-4 sm:mb-6">
          {selectedDocumentId 
            ? "Ask questions about your selected document to get instant answers with sources."
            : "Please select a document from the Documents tab to start chatting."
          }
        </p>
        <div className="w-full max-w-md grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
          {[
            "What are the main points?",
            "Summarize the document",
            "Key recommendations?",
            "Explain the findings"
          ].map((q, i) => (
            <button
              key={i}
              onClick={() => setQuestion(q)}
              disabled={!selectedDocumentId}
              className="p-3 text-xs sm:text-sm text-left bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500/50 hover:bg-gray-750 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="text-gray-300 truncate">{q}</p>
            </button>
          ))}
        </div>
      </div>
    ) : (
      <div className="space-y-4 sm:space-y-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`max-w-[95%] sm:max-w-[80%] ${m.type === "user" ? "ml-auto" : ""}`}>
              {/* Message Header */}
              <div className={`flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 ${m.type === "user" ? "justify-end" : ""}`}>
                {m.type === "bot" && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700">
                    <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  </div>
                )}
                <span className="text-xs text-gray-500">
                  {m.type === "user" ? "You" : "AI Assistant"}
                </span>
                {m.type === "user" && (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-800/30">
                    <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                  </div>
                )}
                <span className="text-xs text-gray-600 hidden xs:inline">{formatTime(m.timestamp)}</span>
              </div>

              {/* Message Content */}
              <div className={`
                ${m.type === "user" 
                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none" 
                  : "bg-gray-800 text-gray-200 rounded-2xl rounded-tl-none border border-gray-700"
                } p-3 sm:p-4
              `}>
                {m.type === "user" ? (
                  <p className="text-white text-sm sm:text-base break-words">{m.text}</p>
                ) : (
                  <div>
                    <p className="text-gray-200 text-sm sm:text-base mb-3 sm:mb-4 break-words">{m.data.answer}</p>
                    
                    {m.data.key_points && m.data.key_points.length > 0 && (
                      <div className="mb-3 sm:mb-4">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <div className="w-1.5 h-4 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                          <h4 className="text-xs sm:text-sm font-medium text-gray-300">Key Points</h4>
                        </div>
                        <ul className="space-y-1.5 sm:space-y-2 ml-3 sm:ml-4">
                          {m.data.key_points.map((point, idx) => (
                            <li key={idx} className="text-xs sm:text-sm text-gray-400 flex items-start gap-1.5 sm:gap-2 break-words">
                              <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {m.data.sources && m.data.sources.length > 0 && (
                      <details className="mt-3 sm:mt-4 group">
                        <summary className="flex items-center justify-between cursor-pointer p-2 sm:p-3 bg-gray-900/50 rounded-lg hover:bg-gray-800 transition-colors">
                          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-300 truncate">
                              Sources ({m.data.sources.length})
                            </span>
                            <span className="text-xs text-gray-500 hidden xs:inline truncate">Click to view</span>
                          </div>
                          <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 group-open:rotate-180 transition-transform flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </summary>
                        <div className="mt-1.5 sm:mt-2 space-y-1.5 sm:space-y-2">
                          {m.data.sources.map((source, idx) => (
                            <div key={idx} className="p-2 sm:p-3 bg-gray-900/30 rounded border border-gray-700">
                              <p className="text-xs sm:text-sm text-gray-400 break-words">{source}</p>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[95%] sm:max-w-[80%]">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700">
                  <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                </div>
                <span className="text-xs text-gray-500">AI Assistant</span>
              </div>
              <div className="bg-gray-800 text-gray-200 rounded-2xl rounded-tl-none border border-gray-700 p-3 sm:p-4">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="animate-pulse flex space-x-1 sm:space-x-2">
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-400 rounded-full"></div>
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-400 rounded-full"></div>
                    <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-blue-400 rounded-full"></div>
                  </div>
                  <span className="text-xs sm:text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
    {/* Scroll anchor */}
    <div ref={messagesEndRef} />
    
    {/* Scroll to bottom button */}
    {showScrollButton && (
      <button
        onClick={scrollToBottom}
        className="absolute bottom-4 right-4 p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all z-10"
        aria-label="Scroll to bottom"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    )}
  </div>

  {/* Input Area - Fixed */}
  <div className="flex-shrink-0 p-3 sm:p-4 border-t border-gray-800 bg-gray-900/30">
    <div className="flex gap-2 sm:gap-3">
      <div className="flex-1 relative">
        <textarea
          className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 sm:p-4 pr-10 sm:pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 resize-none text-sm sm:text-base"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={selectedDocumentId ? "Ask a question about your document..." : "Select a document to start chatting..."}
          rows="1"
          style={{ minHeight: "48px", maxHeight: "120px" }}
          disabled={!selectedDocumentId || loading}
        />
        <button
          onClick={askQuestion}
          disabled={!question.trim() || !selectedDocumentId || loading}
          className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <Send className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
    <p className="text-xs text-gray-500 text-center mt-2 sm:mt-3">
      {selectedDocumentId ? "Press Enter to send • Shift + Enter for new line" : "Select a document from the Documents tab"}
    </p>
  </div>
</div>
  );
}