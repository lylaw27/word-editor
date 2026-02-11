// import { openai } from '@ai-sdk/openai';
// import { streamText } from 'ai';

// export const runtime = 'edge';

// export async function POST(req: Request) {
//   try {
//     const { messages } = await req.json();

//     const result = await streamText({
//       model: openai('gpt-4-turbo'),
//       messages,
//       system: `You are a helpful AI writing assistant embedded in a word processor application. 
//       You help users with:
//       - Writing and editing documents
//       - Grammar and style suggestions
//       - Content generation and brainstorming
//       - Document formatting tips
//       - General writing advice
      
//       Be concise, helpful, and professional in your responses.`,
//     });

//     return result.toDataStreamResponse();
//   } catch (error) {
//     console.error('Chat API error:', error);
//     return new Response(
//       JSON.stringify({ error: 'Failed to process chat request' }),
//       {
//         status: 500,
//         headers: { 'Content-Type': 'application/json' },
//       }
//     );
//   }
// }
