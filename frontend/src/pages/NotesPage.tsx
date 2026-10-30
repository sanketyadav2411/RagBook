import { useState, useEffect, useCallback } from "react";
import api from "../lib/api";
import NoteCard from "../components/NoteCard";

interface Note {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesPageProps {
  user: { id: string; name: string; email: string };
  onLogout: () => void;
  theme: "light" | "dark";
  onToggleTheme: () => void;
}

function NotesPage({ user, onLogout, theme, onToggleTheme }: NotesPageProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState("");

  const fetchNotes = useCallback(async () => {
    try {
      const res = await api.get("/notes");
      setNotes(res.data.notes);
    } catch {
      setError("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    setError("");

    try {
      await api.post("/notes", { title: newTitle.trim() });
      setNewTitle("");
      setShowCreate(false);
      await fetchNotes();
    } catch {
      setError("Failed to create note");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError("");
    try {
      await api.delete(`/notes/${id}`);
      setNotes((prev) => prev.filter((n) => n._id !== id));
    } catch {
      setError("Failed to delete note");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !creating) {
      handleCreate();
    }
    if (e.key === "Escape") {
      setShowCreate(false);
      setNewTitle("");
    }
  };

  return (
    <div className="app-shell">
      {/* Header */}
      <header className="topbar sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="brand flex items-center gap-2.5 text-xl font-extrabold"><span className="brand-mark">R</span>RAGBook</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">{user.name}</span>
            <button onClick={onToggleTheme} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">{theme === "light" ? "☾ Dark" : "☀ Light"}</button>
            <button
              onClick={onLogout}
              className="text-sm text-slate-500 hover:text-emerald-900 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="hero-panel mb-10 rounded-3xl bg-[#eaf2e8] border border-[#dfe9dd] p-8 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div><p className="eyebrow mb-3">Your knowledge space</p><h2 className="hero-title text-4xl md:text-5xl font-extrabold tracking-tight text-[#1b392c]" style={{fontFamily:"Manrope"}}>My notebooks</h2><p className="hero-copy text-[#718276] mt-3 max-w-lg">Collect your documents, ask better questions, and keep useful ideas close.</p></div>
          <button
            onClick={() => setShowCreate(true)}
            className="primary-button px-5 py-3 text-sm font-semibold"
          >
            + New Note
          </button>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl mb-6">
            {error}
          </div>
        )}

        {/* Create note inline form */}
        {showCreate && (
          <div className="surface p-4 mb-6 flex gap-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter note title..."
              autoFocus
              className="soft-input flex-1 px-4 py-3"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="primary-button px-5 py-3 text-sm font-semibold"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => { setShowCreate(false); setNewTitle(""); }}
              className="px-4 py-2 text-slate-500 hover:text-slate-900 text-sm rounded-lg hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Notes grid */}
        {loading ? (
          <div className="surface text-slate-500 text-center py-12">Loading notebooks…</div>
        ) : notes.length === 0 ? (
          <div className="surface text-center py-16 px-6">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-2xl">✦</div>
            <p className="text-[#263c30] text-lg font-semibold mb-2">Your first notebook starts here</p>
            <p className="text-slate-500 text-sm">
              Create a notebook, add source documents, and start exploring.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {notes.map((note) => (
              <NoteCard key={note._id} note={note} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default NotesPage;
