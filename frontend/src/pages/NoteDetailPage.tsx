import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import UploadZone from "../components/UploadZone";
import NoteRightPanel from "../components/NoteRightPanel";

interface Note {
  _id: string;
  title: string;
  createdAt: string;
}

interface NoteDetailPageProps { theme: "light" | "dark"; onToggleTheme: () => void; }

function NoteDetailPage({ theme, onToggleTheme }: NoteDetailPageProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const res = await api.get(`/notes/${id}`);
        setNote(res.data.note);
      } catch {
        setError("Note not found");
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id]);

  if (loading) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center">
        <div className="text-slate-500 text-lg">Loading notebook…</div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="app-shell min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-rose-600 text-lg mb-4">{error || "Note not found"}</p>
          <button
            onClick={() => navigate("/notes")}
            className="text-emerald-700 hover:text-emerald-900"
          >
            ← Back to Notes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen flex flex-col">
      {/* Header */}
      <header className="topbar">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/notes")}
            className="text-slate-500 hover:text-emerald-800 transition-colors"
          >
            ← Back
          </button>
          <span className="brand-mark">R</span><div className="min-w-0"><p className="eyebrow">Notebook</p><h1 className="text-xl font-bold text-[#20372a] truncate">{note.title}</h1></div>
          <button onClick={onToggleTheme} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">{theme === "light" ? "☾ Dark" : "☀ Light"}</button>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="workspace-columns flex-1 flex overflow-hidden max-w-7xl w-full mx-auto">
        {/* Left column — Sources */}
        <div className="workspace-sources w-[340px] shrink-0 border-r border-[#e4e9e2] p-6 overflow-y-auto">
          <p className="eyebrow mb-2">Knowledge base</p><h2 className="text-xl font-bold text-[#20372a] mb-5">Sources</h2>
          <UploadZone noteId={id!} />
        </div>

        {/* Right column — Chat / Summary */}
        <div className="workspace-chat flex-1 p-6 md:p-8 flex flex-col overflow-hidden">
          <NoteRightPanel noteId={id!} />
        </div>
      </div>
    </div>
  );
}

export default NoteDetailPage;
