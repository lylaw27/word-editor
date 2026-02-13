import { NextRequest } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { processAndEmbedPDF, type ProcessingProgress } from '@/api/chat/embeddingProcessor';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';

// Initialize Convex client
function getConvexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error('CONVEX_URL is not set in environment variables');
  }
  return new ConvexHttpClient(url);
}

export async function POST(req: NextRequest) {
  console.log('🔔 /api/embed request received');
  let tempFilePath: string | null = null;

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const filePathParam = formData.get('filePath') as string | null;

    let filePath: string;
    let fileName: string;

    if (file) {
      // Web upload: file came via FormData
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      tempFilePath = path.join(os.tmpdir(), 'word-editor-uploads', `${Date.now()}.pdf`);
      await writeFile(tempFilePath, buffer);
      
      filePath = tempFilePath;
      fileName = file.name;
    } else if (filePathParam) {
      // Electron: file path in form data
      if (!existsSync(filePathParam)) {
        return new Response(
          JSON.stringify({ error: 'Invalid file path' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      filePath = filePathParam;
      fileName = path.basename(filePathParam);
    } else {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const ext = path.extname(filePath).toLowerCase();
    if (ext !== '.pdf') {
      if (tempFilePath) await unlink(tempFilePath);
      return new Response(
        JSON.stringify({ error: 'Only PDF files are supported' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendProgress = (progress: ProcessingProgress) => {
          const data = `data: ${JSON.stringify({ type: 'progress', ...progress })}\n\n`;
          controller.enqueue(encoder.encode(data));
        };

        try {
          // Process the PDF
          const embeddedChunks = await processAndEmbedPDF(filePath, sendProgress);

          // Upload directly to Convex
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
            fileSize: file?.size || 0,
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
          const result = `data: ${JSON.stringify({
            type: 'result',
            fileName,
            filePath,
            fileSize: file?.size || 0,
            totalChunks: embeddedChunks.length,
            documentId,
          })}\n\n`;
          controller.enqueue(encoder.encode(result));

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          console.error('Embed processing error:', error);
          const errorData = `data: ${JSON.stringify({
            type: 'error',
            message: error.message || 'Failed to process document',
          })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        } finally {
          // Clean up temp file
          if (tempFilePath && existsSync(tempFilePath)) {
            try { await unlink(tempFilePath); } catch {}
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Embed API error:', error);
    if (tempFilePath && existsSync(tempFilePath)) {
      try { await unlink(tempFilePath); } catch {}
    }
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
