import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { streamText, convertToModelMessages, type UIMessage, stepCountIs } from 'ai';
import { editorTools } from '../src/tools/editorTools';
import { formatContextAsSystemMessage, type DocumentContext } from './contextBuilder';
import { processAndEmbedPDF, type ProcessingProgress } from './embeddingProcessor';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

// Load environment variables
dotenv.config();

// Initialize Convex client
function getConvexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error('CONVEX_URL is not set in environment variables');
  }
  return new ConvexHttpClient(url);
}

export function createAPIServer(port = 3001) {
  const app = express();
  
  // Logging middleware
  app.use((req, res, next) => {
    console.log(`🌐 ${req.method} ${req.url}`);
    next();
  });
  
  app.use(cors());
  app.use(express.json({ limit: '50mb' })); // Increase payload limit for embeddings
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.post('/api/chat', async (req, res) => {
    console.log('🔔 /api/chat request received');
    try {
      const { 
        messages, 
        context 
      }: { 
        messages: UIMessage[]; 
        context?: DocumentContext; 
      } = req.body;
      
      console.log('📨 Received messages:', JSON.stringify(messages, null, 2));
      console.log('📄 Context received:', context ? 'Yes' : 'No');
      if (context?.selection) {
        console.log('✂️  User has selection:', context.selection.text);
      }

      // Convert UIMessage[] to ModelMessage[] format
      const modelMessages = await convertToModelMessages(messages);

      // Build base system prompt
      let systemPrompt = `You are a helpful AI writing assistant embedded in a word processor application.
You help users write, edit, and improve their documents.

## TOOL ROUTING — WHEN TO USE EACH TOOL

Choose the right tool(s) automatically based on user intent:

### editTool — Document Editing
Use this tool whenever the user's message implies CHANGING the document content. You do NOT need the user to say "edit" or "use the edit tool". Trigger on intent signals like:
- Requests to fix, improve, rewrite, rephrase, or polish text
- Grammar, spelling, punctuation, or style corrections ("fix the grammar", "make it more formal")
- Adding new content to the document ("add a paragraph about...", "write an intro", "expand on this")
- Removing or shortening content ("delete the second paragraph", "make it more concise")
- Restructuring, reordering, or reformatting ("move this above...", "turn this into bullet points")
- Tone or voice changes ("make it friendlier", "more professional")
- Any instruction that would result in the document looking different afterward
- When the user has selected text and asks you to do something with it

### retrievalTool — Knowledge Base Search (RAG)
⚠️ CRITICAL: NEVER ask the user for information. ALWAYS use this tool FIRST when you need information or are uncertain. Trigger automatically when:
- You don't know the answer or lack context for the user's request
- Questions about ANY specific topics, concepts, or terms (technical, domain-specific, policy-related)
- User asks to write/add content about something that MIGHT be documented
- Questions that require information beyond the current document ("what does the policy say about...", "according to our guidelines...")
- Requests to incorporate external knowledge ("add the key points from the uploaded report", "summarize what we know about X")
- Requests to write/add content about domain-specific topics that likely exist in embedded docs
- Fact-checking against source material ("is this consistent with the documentation?")
- When the user references uploaded/embedded PDFs or documents
- Requests that need domain-specific knowledge not present in the current document
- "Based on the documents...", "What do we have on...", "Find information about..."
- You need more context or background information before making edits

MANDATORY BEHAVIOR:
1. DEFAULT TO SEARCH: Assume information exists in knowledge base until proven otherwise
2. NEVER ASK USER FIRST: Don't ask "can you provide more details?" - search first
3. ONLY ASK AFTER EMPTY RESULTS: Only ask user for clarification if retrievalTool returns no results

### CRITICAL WORKFLOW — Search Before Edit
ALWAYS use retrievalTool FIRST if you need information before performing an edit:
- "Add a section about X" where X is unfamiliar → retrievalTool first, then editTool with retrieved info
- "Write about [specific topic]" → retrievalTool to gather information, then editTool to incorporate it
- "Update the intro to align with our style guide" → retrievalTool to get style guide, then editTool to apply it
- "Incorporate the key findings into paragraph 3" → retrievalTool to get findings, then editTool to weave them in
- User asks about domain-specific terms or concepts → retrievalTool first to understand, then respond or edit

Don't guess or hallucinate information. If you're unsure, search the knowledge base first.

### Plain text response (NO tool)
Respond conversationally without tools only when:
- The user asks a question that can be answered from the current document context alone
- The user wants writing advice, brainstorming, or discussion (not actual document changes)
- The user asks about your capabilities or how to use the editor
- You're clarifying the user's intent before taking action

## BEHAVIORAL GUIDELINES
- SEARCH WHEN UNCERTAIN: If you don't know something or lack context, use retrievalTool before responding or editing. Never guess or hallucinate.
- Default to ACTION: if the user's message can reasonably be interpreted as wanting a document change, use editTool. Err on the side of making edits rather than just talking about edits.
- SEARCH BEFORE EDIT: When asked to write about unfamiliar topics, use retrievalTool first to gather information, then use editTool to incorporate it.
- Be proactive: if the user says "this paragraph is bad", don't just explain why — fix it with editTool.
- When the user has selected text, they almost certainly want you to act on that selection.
- Be concise in your text responses. Let the edits speak for themselves.
- After using editTool, briefly explain what you changed and why.
- If retrievalTool finds no relevant information, acknowledge this and offer to help with what you do know.`;

      // Format and append document context if available
      if (context) {
        const contextMessage = formatContextAsSystemMessage(context);
        systemPrompt += `\n\n${contextMessage}`;
      }

      // Use streamText for streaming responses (AI SDK standard)
      // NOTE: Tools are defined here for LLM, but executed client-side in ChatPanel.tsx
      const result = streamText({
        model: 'openai/gpt-5.2',
        messages: modelMessages,
        system: systemPrompt,
        tools: editorTools,  // TODO: Re-enable tools once import issue is fixed
        stopWhen: stepCountIs(5)  // Allow up to 5 tool call iterations
      });
      console.log('🚀 Streaming response started');
      // Return streaming response in UI message format
      result.pipeUIMessageStreamToResponse(res);
    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  });

  // Multer config for web file uploads (temp directory)
  const upload = multer({ dest: path.join(os.tmpdir(), 'word-editor-uploads') });

  app.post('/api/embed', upload.single('file'), async (req, res) => {
    console.log('🔔 /api/embed request received');
    let tempFilePath: string | null = null;
    try {
      let filePath: string;

      if (req.file) {
        // Web upload: file came via FormData
        tempFilePath = req.file.path;
        // Rename to have .pdf extension so pdf-parse works
        const pdfPath = tempFilePath + '.pdf';
        fs.renameSync(tempFilePath, pdfPath);
        tempFilePath = pdfPath;
        filePath = pdfPath;
      } else {
        // Electron: file path in JSON body
        const body = req.body as { filePath?: string };
        if (!body.filePath || !fs.existsSync(body.filePath)) {
          res.status(400).json({ error: 'Invalid file path' });
          return;
        }
        filePath = body.filePath;
      }

      const ext = path.extname(filePath).toLowerCase();
      if (ext !== '.pdf') {
        res.status(400).json({ error: 'Only PDF files are supported' });
        return;
      }

      const fileName = req.file?.originalname || path.basename(filePath);
      const fileSize = fs.statSync(filePath).size;

      // Set up SSE for progress updates
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const sendProgress = (progress: ProcessingProgress) => {
        res.write(`data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`);
      };

      // Process the PDF
      const embeddedChunks = await processAndEmbedPDF(filePath, sendProgress);

      // Upload directly to Convex from backend
      sendProgress({
        stage: 'uploading',
        message: 'Uploading embeddings to database...',
        progress: 92,
        totalChunks: embeddedChunks.length,
      });

      const convex = getConvexClient();

      // 1. Create document record
      const documentId = await convex.mutation(api.embeddings.createDocument, {
        fileName,
        filePath,
        fileSize,
      });

      console.log(`📄 Created document: ${documentId}`);

      // 2. Upload chunks in batches of 20
      const batchSize = 20;
      for (let i = 0; i < embeddedChunks.length; i += batchSize) {
        const batch = embeddedChunks.slice(i, i + batchSize);
        await convex.mutation(api.embeddings.storeChunks, {
          documentId,
          chunks: batch,
        });
        console.log(`📦 Uploaded chunks ${i + 1}–${Math.min(i + batchSize, embeddedChunks.length)}`);
      }

      // 3. Mark as completed
      await convex.mutation(api.embeddings.completeDocument, {
        documentId,
        totalChunks: embeddedChunks.length,
      });

      console.log(`✅ Document ${fileName} fully embedded (${embeddedChunks.length} chunks)`);

      // Send success result
      res.write(
        `data: ${JSON.stringify({
          type: 'result',
          fileName,
          filePath,
          fileSize,
          totalChunks: embeddedChunks.length,
          documentId,
        })}\n\n`
      );

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error('Embed API error:', error);
      // If headers already sent (SSE mode), send error event
      if (res.headersSent) {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            message: error.message || 'Failed to process document',
          })}\n\n`
        );
        res.end();
      } else {
        res.status(500).json({ error: error.message || 'Failed to process document' });
      }
    } finally {
      // Clean up temp file from web uploads
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch {}
      }
    }
  });

  // List embedded documents
  app.get('/api/embed/documents', async (_req, res) => {
    try {
      const convex = getConvexClient();
      const documents = await convex.query(api.embeddings.listDocuments, {});
      const mapped = documents.map((doc) => ({
        id: doc._id,
        fileName: doc.fileName,
        filePath: doc.filePath,
        totalChunks: doc.totalChunks,
        status: doc.status,
        createdAt: doc.createdAt,
      }));
      res.json(mapped);
    } catch (error: any) {
      console.error('List documents error:', error);
      res.status(500).json({ error: error.message || 'Failed to list documents' });
    }
  });

  // Delete an embedded document
  app.delete('/api/embed/documents/:id', async (req, res) => {
    try {
      const convex = getConvexClient();
      await convex.mutation(api.embeddings.deleteDocument, {
        documentId: req.params.id as any,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: error.message || 'Failed to delete document' });
    }
  });

  // Search embedded documents using RAG
  app.post('/api/embed/search', async (req, res) => {
    console.log('🔔 /api/embed/search request received');
    try {
      const { query, limit, minScore } = req.body as {
        query: string;
        limit?: number;
        minScore?: number;
      };

      if (!query) {
        res.status(400).json({ error: 'Query text is required' });
        return;
      }

      // Generate embedding for the query
      const { embedMany } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      
      const { embeddings } = await embedMany({
        model: openai.embedding('text-embedding-3-small'),
        values: [query],
      });

      const queryEmbedding = embeddings[0];

      // Search in Convex
      const convex = getConvexClient();
      const results = await convex.action(api.embeddings.searchByEmbedding, {
        queryEmbedding,
        limit: limit ?? 10,
        minScore: minScore ?? 0.8,
      });

      console.log(`🔍 Found ${results.length} results for query: "${query.substring(0, 50)}..."`);
      res.json({ results, query });
    } catch (error: any) {
      console.error('Search error:', error);
      res.status(500).json({ error: error.message || 'Failed to search documents' });
    }
  });

  const server = app.listen(port, () => {
    console.log(`🚀 API server running on http://localhost:${port}`);
  });
  
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} already in use, skipping server start`);
    } else {
      console.error('❌ API server error:', err);
    }
  });

  return server;
}
