import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Load environment variables
dotenv.config();

export function createAPIServer(port = 3001) {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  app.post('/api/chat', async (req, res) => {
    try {
      const { messages } = req.body;

      const result = await streamText({
        model: openai('gpt-4-turbo'),
        messages,
        system: `You are a helpful AI writing assistant embedded in a word processor application. 
        You help users with:
        - Writing and editing documents
        - Grammar and style suggestions
        - Content generation and brainstorming
        - Document formatting tips
        - General writing advice
        
        Be concise, helpful, and professional in your responses.`,
      });

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Stream the response
      const stream = result.toAIStream();
      const reader = stream.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
        res.end();
      }
    } catch (error) {
      console.error('Chat API error:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  });

  const server = app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });

  return server;
}
