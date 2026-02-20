// Message.jsx - Improved with dark theme
import React from "react";
import { User, Bot, CheckCircle, Copy } from "lucide-react";
import SourceList from "./SourceList";

export default function Message({ message }) {
  const [copied, setCopied] = React.useState(false);

  const copyToClipboard = async (text) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.type === "user") {
    return (
      <div className="flex justify-end mb-6">
        <div className="max-w-[85%] lg:max-w-[80%]">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <span className="text-xs text-gray-500">You</span>
            <User className="w-4 h-4 text-blue-400" />
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-2xl rounded-tr-none">
            <p className="text-white">{message.text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex mb-6">
      <div className="max-w-[85%] lg:max-w-[80%]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-gray-800 to-gray-900 border border-gray-700">
            <Bot className="w-4 h-4 text-green-400" />
          </div>
          <span className="text-xs text-gray-500">AI Assistant</span>
        </div>
        <div className="bg-gray-800 rounded-2xl rounded-tl-none p-5 border border-gray-700 shadow-lg">
          <div className="flex items-start justify-between mb-4">
            <p className="text-gray-200 text-base leading-relaxed">
              {message.data.data.answer}
            </p>
            <button
              onClick={() => copyToClipboard(message.data.data.answer)}
              className="ml-3 p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
              title="Copy to clipboard"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {message.data.data.key_points && message.data.data.key_points.length > 0 && (
            <div className="mt-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1.5 h-4 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full"></div>
                <h4 className="text-sm font-semibold text-gray-300">Key Points</h4>
              </div>
              <ul className="space-y-3">
                {message.data.data.key_points.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-700 text-xs text-gray-300 mt-0.5 flex-shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm text-gray-400">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {message.data.data.sources && message.data.data.sources.length > 0 && (
            <SourceList sources={message.data.data.sources} />
          )}


          {message.data.sources && message.data.sources.length > 0 && (
            <SourceList sources={message.data.sources} />
          )}
        </div>
      </div>
    </div>
  );
}