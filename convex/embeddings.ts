import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Create a new document record (status: processing)
export const createDocument = mutation({
  args: {
    fileName: v.string(),
    filePath: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const documentId = await ctx.db.insert("documents", {
      fileName: args.fileName,
      filePath: args.filePath,
      fileSize: args.fileSize,
      totalChunks: 0,
      status: "processing",
      createdAt: Date.now(),
    });
    return documentId;
  },
});

// Store a batch of chunks with embeddings for a document
export const storeChunks = mutation({
  args: {
    documentId: v.id("documents"),
    chunks: v.array(
      v.object({
        chunkIndex: v.number(),
        text: v.string(),
        section: v.optional(v.string()),
        embedding: v.array(v.float64()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const chunk of args.chunks) {
      await ctx.db.insert("chunks", {
        documentId: args.documentId,
        chunkIndex: chunk.chunkIndex,
        text: chunk.text,
        section: chunk.section,
        embedding: chunk.embedding,
      });
    }
    return args.chunks.length;
  },
});

// Mark document as completed with final chunk count
export const completeDocument = mutation({
  args: {
    documentId: v.id("documents"),
    totalChunks: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: "completed",
      totalChunks: args.totalChunks,
    });
  },
});

// Mark document as failed with error message
export const failDocument = mutation({
  args: {
    documentId: v.id("documents"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      status: "failed",
      error: args.error,
    });
  },
});

// List all embedded documents
export const listDocuments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("documents")
      .order("desc")
      .collect();
  },
});

// Search chunks by vector similarity
export const searchChunks = query({
  args: {
    embedding: v.array(v.float64()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("chunks")
      .withIndex("by_document")
      .collect();

    // Note: For production, use vectorSearch action instead
    // This is a basic query; vector search requires an action
    return results.slice(0, args.limit ?? 10);
  },
});

// Delete a document and all its chunks
export const deleteDocument = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    // Delete all chunks for this document
    const chunks = await ctx.db
      .query("chunks")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .collect();

    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id);
    }

    // Delete the document itself
    await ctx.db.delete(args.documentId);
  },
});

// Vector search action for RAG
export const searchByEmbedding = action({
  args: {
    queryEmbedding: v.array(v.float64()),
    limit: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const limit = args.limit ?? 10;
    const minScore = args.minScore ?? 0.8;

    // Perform vector search
    const results = await ctx.vectorSearch("chunks", "by_embedding", {
      vector: args.queryEmbedding,
      limit: limit * 2, // Fetch more to filter by score
    });

    // Filter by score and get chunk details
    const filteredResults = [];
    for (const result of results) {
      if (result._score >= minScore) {
        const chunk: any = await ctx.runQuery(api.embeddings.getChunkById, {
          chunkId: result._id,
        });
        
        if (chunk) {
          filteredResults.push({
            ...chunk,
            score: result._score,
          });
        }

        if (filteredResults.length >= limit) break;
      }
    }

    return filteredResults;
  },
});

// Helper query to get chunk by ID
export const getChunkById = query({
  args: {
    chunkId: v.id("chunks"),
  },
  handler: async (ctx, args) => {
    const chunk = await ctx.db.get(args.chunkId);
    if (!chunk) return null;

    // Get document metadata
    const document = await ctx.db.get(chunk.documentId);

    return {
      _id: chunk._id,
      text: chunk.text,
      section: chunk.section,
      chunkIndex: chunk.chunkIndex,
      documentId: chunk.documentId,
      documentName: document?.fileName,
      documentPath: document?.filePath,
    };
  },
});
