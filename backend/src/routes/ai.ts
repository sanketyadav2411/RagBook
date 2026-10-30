import { Router, Request, Response } from "express";
import Note from "../models/Note";
import asyncHandler from "../middleware/asyncHandler";
import requireAuth from "../middleware/requireAuth";
import { generateSummary } from "../services/ai/summarize";

const router = Router();
router.use(requireAuth);

// POST /api/ai/:noteId/summary
router.post(
  "/:noteId/summary",
  asyncHandler(async (req: Request, res: Response) => {
    const { noteId } = req.params;

    const note = await Note.findOne({ _id: noteId, userId: req.userId });
    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }

    try {
      const summary = await generateSummary(noteId);
      res.json({ summary });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate summary";
      // If Qdrant collection doesn't exist, no docs uploaded yet
      if (msg.includes("doesn't exist") || msg.includes("Not found")) {
        res.json({ summary: "No documents uploaded yet. Please upload documents first." });
        return;
      }
      throw err;
    }
  })
);

export default router;
