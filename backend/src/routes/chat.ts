import { Router, Request, Response } from "express";
import Groq from "groq-sdk";
import Note from "../models/Note";
import asyncHandler from "../middleware/asyncHandler";
import requireAuth from "../middleware/requireAuth";
import { retrieveChunks } from "../services/rag/retrieve";

const router = Router();
router.use(requireAuth);

router.post(
  "/:noteId",
  asyncHandler(async (req: Request, res: Response) => {
    const { noteId } = req.params;
    const { question, history } = req.body as {
      question: string;
      history?: { role: "user" | "model"; text: string }[];
    };

    if (!question?.trim()) {
      res.status(400).json({ message: "question is required" });
      return;
    }

    const note = await Note.findOne({ _id: noteId, userId: req.userId });
    if (!note) {
      res.status(404).json({ message: "Note not found" });
      return;
    }

    let contextText = "";
    try {
      const chunks = await retrieveChunks(question, noteId);
      if (chunks.length > 0) {
        contextText = chunks
          .map((c, i) => `[Source ${i + 1} — ${c.documentName}]\n${c.text}`)
          .join("\n\n---\n\n");
      }
    } catch {
      contextText = "";
    }

    const systemPrompt = contextText
      ? `You are a helpful research assistant. Answer the user's question using ONLY the provided document excerpts below. If the answer is not in the excerpts, say so clearly.\n\nDocument excerpts:\n${contextText}`
      : `You are a helpful research assistant. No documents have been uploaded yet. Let the user know they should upload documents first.`;

    const chatHistory = (history ?? []).map((h) => ({
      role: (h.role === "model" ? "assistant" : "user") as "assistant" | "user",
      content: h.text,
    }));

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: question },
      ],
    });

    const answer = completion.choices[0]?.message?.content ?? "";
    res.json({ answer });
  })
);

export default router;
