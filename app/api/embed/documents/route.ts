import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

export const dynamic = 'force-dynamic';

// Initialize Convex client
function getConvexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error('CONVEX_URL is not set in environment variables');
  }
  return new ConvexHttpClient(url);
}

// List embedded documents
export async function GET() {
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
    
    return Response.json(mapped);
  } catch (error: any) {
    console.error('List documents error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to list documents' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
