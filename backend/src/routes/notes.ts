import { Router, Request, Response } from "express";
import Note from "../models/Note";
import asyncHandler from "../middleware/asyncHandler";
import requireAuth from "../middleware/requireAuth";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// GET /api/notes — list all notes for the authenticated user
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json({ notes });
  })
);

// POST /api/notes — create a new note
router.post(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { title } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ message: "Title is required" });
      return;
    }

    const note = await Note.create({
      title: title.trim(),
      userId: req.userId,
    });

    res.status(201).json({ note });
  })
);

// GET /api/notes/:id — get a single note (must belong to user)
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }

    res.json({ note });
  })
);

// PUT /api/notes/:id — update a note (title only for now)
router.put(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const { title } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ message: "Title is required" });
      return;
    }

    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { title: title.trim() },
      { new: true }
    );

    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }

    res.json({ note });
  })
);

// DELETE /api/notes/:id — delete a note
router.delete(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }

    res.json({ message: "Note deleted" });
  })
);

export default router;
