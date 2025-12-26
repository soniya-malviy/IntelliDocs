// SourceList.jsx - Improved with dark theme
import React from "react";
import { ChevronDown, Link, FileText } from "lucide-react";

export default function SourceList({ sources }) {
  return (
    <details className="mt-4 group">
      <summary className="flex items-center justify-between cursor-pointer p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-900/30 rounded">
            <Link className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-sm font-medium text-gray-200">
              View Sources ({sources.length})
            </span>
            <p className="text-xs text-gray-500">References from your documents</p>
          </div>
        </div>
        <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" />
      </summary>
      <div className="mt-3 space-y-2">
        {sources.map((s, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
          >
            <div className="mt-1">
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 text-xs text-gray-400 font-medium">
                {i + 1}
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-400">Document Reference</span>
              </div>
              <p className="text-sm text-gray-300">{s}</p>
            </div>
          </div>
        ))}
      </div>
    </details>
  );
}