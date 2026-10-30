import mongoose, { Document, Schema, Types } from "mongoose";

export interface IDocument extends Document {
  noteId: Types.ObjectId;
  filename: string;
  originalName: string;
  status: "uploading" | "processing" | "ready" | "error";
  chunkCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    noteId: {
      type: Schema.Types.ObjectId,
      ref: "Note",
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["uploading", "processing", "ready", "error"],
      default: "uploading",
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const DocModel = mongoose.model<IDocument>("Document", documentSchema);

export default DocModel;
