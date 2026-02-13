import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../convex/_generated/api';

// Initialize Convex client
function getConvexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error('CONVEX_URL is not set in environment variables');
  }
  return new ConvexHttpClient(url);
}

// Search embedded documents using RAG
export async function POST(req: Request) {
  console.log('🔔 /api/embed/search request received');
  
  try {
    const body = await req.json();
    const { query, limit, minScore } = body as {
      query: string;
      limit?: number;
      minScore?: number;
    };

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate embedding for the query
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
    
    return Response.json({ results, query });
  } catch (error: any) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to search documents' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
