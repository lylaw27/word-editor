import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Stores metadata about each embedded document
  documents: defineTable({
    fileName: v.string(),
    filePath: v.string(),
    fileSize: v.number(),
    totalChunks: v.number(),
    status: v.union(
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed")
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_status", ["status"]),

  // Stores individual text chunks with their embeddings
  chunks: defineTable({
    documentId: v.id("documents"),
    chunkIndex: v.number(),
    text: v.string(),
    section: v.optional(v.string()), // chapter/section heading if detected
    embedding: v.array(v.float64()),
  })
    .index("by_document", ["documentId", "chunkIndex"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536, // text-embedding-3-small dimension
      filterFields: ["documentId"],
    }),
});
