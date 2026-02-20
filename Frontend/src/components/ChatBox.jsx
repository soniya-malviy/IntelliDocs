// ChatBox.jsx - Updated with persistent chat
import React from "react";
import { useState, useEffect, useRef } from "react";
import { Send, Bot, User, Sparkles, Copy, CheckCircle, RefreshCw, ChevronDown, BookOpen, Lightbulb, FileText, CheckCircle2 } from "lucide-react";
import api from "../api/axios";

export default function ChatBox({ selectedDocumentId, chatHistory = [], setChatHistory }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Load messages for selected document when it changes
  useEffect(() => {
    // Load messages from localStorage for the selected document
    if (selectedDocumentId) {
      const savedMessages = localStorage.getItem(`chat_${selectedDocumentId}`);
      if (savedMessages) {
        // console.log(savedMessages
        // )
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

        // Handle timeout specifically
        let errorText = "Sorry, I couldn't process your request. Please try again.";
        if (error.code === "ECONNABORTED" || error.message?.includes("timeout")) {
          errorText = "Request timeout. The server is taking too long to process your question. Please try again with a simpler question or smaller document.";
        } else if (error.response?.data?.error) {
          errorText = error.response.data.error;
        } else if (error.response?.data?.message) {
          errorText = error.response.data.message;
        }

        // Add error message
        const errorMessage = {
          type: "bot",
          data: {
            answer: errorText,
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

  const copyToClipboard = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex flex-col h-full glass-card rounded-2xl overflow-hidden border border-gray-800/50 shadow-2xl">
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
          <div className="space-y-5 sm:space-y-6">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.type === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className={`max-w-[95%] sm:max-w-[80%] ${m.type === "user" ? "ml-auto" : ""}`}>
                  {/* Message Header */}
                  <div className={`flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3 ${m.type === "user" ? "justify-end" : ""}`}>
                    {m.type === "bot" && (
                      <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 shadow-sm">
                        <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-gray-400">
                      {m.type === "user" ? "You" : "AI Assistant"}
                    </span>
                    {m.type === "user" && (
                      <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 shadow-sm">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                      </div>
                    )}
                    <span className="text-xs text-gray-500/70 hidden xs:inline font-mono">{formatTime(m.timestamp)}</span>
                  </div>

                  {/* Message Content */}
                  <div className={`
                ${m.type === "user"
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl rounded-tr-none shadow-lg"
                      : "bg-gradient-to-br from-gray-800 to-gray-800/90 text-gray-200 rounded-2xl rounded-tl-none border border-gray-700/50 shadow-xl backdrop-blur-sm"
                    } p-4 sm:p-5 relative group
              `}>
                    {m.type === "user" ? (
                      <p className="text-white text-sm sm:text-base break-words leading-relaxed">{m.text}</p>
                    ) : (
                      <div className="space-y-4">
                        {/* Answer Section with Copy Button */}
                        <div className="relative">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-gray-100 text-sm sm:text-base leading-relaxed break-words flex-1">
                              {m.data.data.answer}
                            </p>
                            <button
                              onClick={() => copyToClipboard(m.data.answer, i)}
                              className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 active:scale-95"
                              title="Copy answer"
                            >
                              {copiedMessageId === i ? (
                                <CheckCircle2 className="w-4 h-4 text-green-400 animate-in zoom-in duration-200" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Key Points Section */}
                        {m.data.key_points && m.data.key_points.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-700/50">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg">
                                <Lightbulb className="w-4 h-4 text-yellow-400" />
                              </div>
                              <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                                Key Points
                                <span className="text-xs font-normal text-gray-400">({m.data.key_points.length})</span>
                              </h4>
                            </div>
                            <div className="space-y-2.5 ml-8">
                              {m.data.key_points.map((point, idx) => (
                                <div key={idx} className="flex items-start gap-3 group/item">
                                  <div className="flex-shrink-0 mt-1.5">
                                    <div className="w-1.5 h-1.5 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full"></div>
                                  </div>
                                  <p className="text-sm text-gray-300 leading-relaxed break-words flex-1">
                                    {point}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sources Section */}
                        {m.data.sources && m.data.sources.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-700/50">
                            <details className="group/source">
                              <summary className="flex items-center justify-between cursor-pointer p-2.5 -mx-2.5 rounded-lg hover:bg-gray-700/30 transition-colors">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="p-1.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg">
                                    <FileText className="w-4 h-4 text-purple-400" />
                                  </div>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-sm font-semibold text-gray-200">
                                      Sources
                                    </span>
                                    <span className="px-2 py-0.5 bg-gray-700/50 text-xs text-gray-400 rounded-full">
                                      {m.data.sources.length}
                                    </span>
                                  </div>
                                </div>
                                <svg
                                  className="w-4 h-4 text-gray-400 group-open/source:rotate-180 transition-transform flex-shrink-0"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </summary>
                              <div className="mt-3 space-y-2.5">
                                {m.data.sources.map((source, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3 bg-gray-900/40 rounded-lg border border-gray-700/30 hover:border-gray-600/50 transition-colors"
                                  >
                                    <div className="flex items-start gap-2">
                                      <BookOpen className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
                                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed break-words flex-1">
                                        {source}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="max-w-[95%] sm:max-w-[80%]">
                  <div className="flex items-center gap-2 sm:gap-2.5 mb-2 sm:mb-3">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 shadow-sm animate-pulse">
                      <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                    </div>
                    <span className="text-xs font-medium text-gray-400">AI Assistant</span>
                  </div>
                  <div className="bg-gradient-to-br from-gray-800 to-gray-800/90 text-gray-200 rounded-2xl rounded-tl-none border border-gray-700/50 shadow-xl p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex space-x-1.5">
                        <div className="h-2 w-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="h-2 w-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="h-2 w-2 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-sm text-gray-400 font-medium">Analyzing document...</span>
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