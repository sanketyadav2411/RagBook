import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import Note from "../models/Note";
import DocModel from "../models/Document";
import asyncHandler from "../middleware/asyncHandler";
import requireAuth from "../middleware/requireAuth";
import { ingestDocument } from "../services/rag/ingest";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, "../../uploads"));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${randomUUID()}${ext}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowedExts = [".pdf", ".txt"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Only PDF and TXT files are allowed.`));
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB max
  },
});

// POST /api/docs/upload — upload a document and start ingestion
router.post(
  "/upload",
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    const { noteId } = req.body;

    if (!noteId) {
      res.status(400).json({ message: "noteId is required" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file provided" });
      return;
    }

    // Verify note belongs to user
    const note = await Note.findOne({ _id: noteId, userId: req.userId });
    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }

    // Create document record
    const doc = await DocModel.create({
      noteId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      status: "uploading",
    });

    // Kick off async ingestion (fire-and-forget)
    ingestDocument(doc._id.toString()).catch((err) => {
      console.error("Ingest pipeline failed:", err);
    });

    res.status(201).json({ document: doc });
  })
);

// GET /api/docs?noteId= — list documents for a note
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { noteId } = req.query;

    if (!noteId || typeof noteId !== "string") {
      res.status(400).json({ message: "noteId query parameter is required" });
      return;
    }

    // Verify note belongs to user
    const note = await Note.findOne({ _id: noteId, userId: req.userId });
    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }

    const documents = await DocModel.find({ noteId }).sort({ createdAt: -1 });
    res.json({ documents });
  })
);

export default router;
