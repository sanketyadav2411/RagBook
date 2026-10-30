import { useState, useEffect, useCallback, useRef } from "react";
import api from "../lib/api";

interface DocRecord {
  _id: string;
  originalName: string;
  status: "uploading" | "processing" | "ready" | "error";
  chunkCount: number;
  errorMessage?: string;
  createdAt: string;
}

interface UploadZoneProps {
  noteId: string;
}

function UploadZone({ noteId }: UploadZoneProps) {
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await api.get(`/docs?noteId=${noteId}`);
      setDocuments(res.data.documents);
    } catch {
      // Silently fail polling
    }
  }, [noteId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // Poll for status updates when any doc is in progress
  useEffect(() => {
    const hasInProgress = documents.some(
      (d) => d.status === "uploading" || d.status === "processing"
    );

    if (hasInProgress) {
      pollRef.current = setInterval(fetchDocs, 3000);
    } else if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [documents, fetchDocs]);

  const handleUpload = async (file: File) => {
    const allowedExts = [".pdf", ".txt"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!allowedExts.includes(ext)) {
      setError("Only PDF and TXT files are allowed");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("noteId", noteId);

      await api.post("/docs/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      await fetchDocs();
    } catch {
      setError("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const statusBadge = (status: string, errorMessage?: string) => {
    switch (status) {
      case "uploading":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-400">Uploading</span>;
      case "processing":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/50 text-blue-400 animate-pulse">Processing</span>;
      case "ready":
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400">Ready</span>;
      case "error":
        return (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-900/50 text-red-400" title={errorMessage}>
            Error
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-900/20"
            : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
        <div className="text-gray-400">
          {uploading ? (
            <p className="animate-pulse">Uploading...</p>
          ) : (
            <>
              <p className="text-sm mb-1">Drop a PDF or TXT file here</p>
              <p className="text-xs text-gray-600">or click to browse</p>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-3 text-sm text-red-400">{error}</div>
      )}

      {/* Document list */}
      {documents.length > 0 && (
        <div className="mt-4 space-y-2">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm text-white truncate">{doc.originalName}</p>
                {doc.status === "ready" && (
                  <p className="text-xs text-gray-500">{doc.chunkCount} chunk{doc.chunkCount !== 1 ? "s" : ""}</p>
                )}
                {doc.status === "error" && doc.errorMessage && (
                  <p className="text-xs text-red-400 truncate">{doc.errorMessage}</p>
                )}
              </div>
              {statusBadge(doc.status, doc.errorMessage)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UploadZone;
