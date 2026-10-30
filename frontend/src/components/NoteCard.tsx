import { useNavigate } from "react-router-dom";

interface NoteCardProps {
  note: {
    _id: string;
    title: string;
    createdAt: string;
  };
  onDelete: (id: string) => void;
}

function NoteCard({ note, onDelete }: NoteCardProps) {
  const navigate = useNavigate();

  const formattedDate = new Date(note.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleClick = () => {
    navigate(`/notes/${note._id}`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note._id);
  };

  return (
    <div
      onClick={handleClick}
      className="surface note-card p-6 cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf4ec] text-[#347354] mb-4">▤</span>
        <h3 className="text-[#24392e] font-semibold text-lg truncate flex-1">
          {note.title}
        </h3>
        <button
          onClick={handleDelete}
          className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1 rounded-lg hover:bg-red-50 shrink-0"
          title="Delete note"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <p className="text-slate-400 text-xs mt-5 pt-4 border-t border-slate-100">Created {formattedDate}<span className="float-right text-emerald-700">Open notebook →</span></p>
    </div>
  );
}

export default NoteCard;
