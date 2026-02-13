import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../../../convex/_generated/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize Convex client
function getConvexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error('CONVEX_URL is not set in environment variables');
  }
  return new ConvexHttpClient(url);
}

// Delete an embedded document
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const convex = getConvexClient();
    await convex.mutation(api.embeddings.deleteDocument, {
      documentId: params.id as any,
    });
    
    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Delete document error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to delete document' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
