import { useState } from "react";
import { useRef } from "react";
import ChatWindow from "./ChatWindow";
import api from "../lib/api";

type Tab = "chat" | "summary";

interface NoteRightPanelProps {
  noteId: string;
}

function NoteRightPanel({ noteId }: NoteRightPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  // Summary state
  const [summary, setSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");
  const summaryFetched = useRef(false);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "summary" && !summaryFetched.current) {
      fetchSummary();
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const res = await api.post(`/ai/${noteId}/summary`);
      setSummary(res.data.summary);
      summaryFetched.current = true;
} catch (err) {
  console.error("Summary error:", err);
  setSummaryError("Failed to generate summary. Please try again.");
}    
    
    finally {
      setSummaryLoading(false);
    }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "chat", label: "Chat" },
    { key: "summary", label: "Summary" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b border-gray-800 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabClick(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content — all mounted, toggled by visibility to preserve chat state */}
      <div className="flex-1 overflow-hidden" style={{ display: activeTab === "chat" ? "flex" : "none" }} >
        <div className="flex flex-col flex-1 min-h-0">
          <ChatWindow noteId={noteId} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ display: activeTab === "summary" ? "block" : "none" }}>
        {summaryLoading && (
          <div className="flex items-center gap-2 text-gray-400 text-sm mt-4">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Generating summary…
          </div>
        )}
        {summaryError && (
          <div className="mt-4">
            <p className="text-red-400 text-sm mb-3">{summaryError}</p>
            <button
              onClick={() => { summaryFetched.current = false; fetchSummary(); }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Try again
            </button>
          </div>
        )}
        {summary && !summaryLoading && (
          <div className="prose prose-invert prose-sm max-w-none">
            <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">{summary}</p>
          </div>
        )}
        {!summaryLoading && !summaryError && !summary && (
          <p className="text-gray-500 text-sm mt-4">Click the Summary tab to generate.</p>
        )}
      </div>
    </div>
  );
}

export default NoteRightPanel;
