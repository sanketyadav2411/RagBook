import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRouter from "./routes/auth";
import notesRouter from "./routes/notes";
import docsRouter from "./routes/docs";
import chatRouter from "./routes/chat";
import aiRouter from "./routes/ai";
import errorHandler from "./middleware/errorHandler";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/notes", notesRouter);
app.use("/api/docs", docsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/ai", aiRouter);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
