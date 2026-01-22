import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { generateText, convertToModelMessages, type UIMessage } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Load environment variables
dotenv.config();

const v4api = createOpenAICompatible({
  name: 'v4api',
  apiKey: process.env.OPENAI_API_KEY!,
  baseURL: "https://api.gpt.ge/v1"
});

export function createAPIServer(port = 3001) {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  app.post('/api/chat', async (req, res) => {
    try {
      const { messages }: { messages: UIMessage[] } = req.body;
      console.log('📨 Received messages:', JSON.stringify(messages, null, 2));

      // Convert UIMessage[] to ModelMessage[] format
      const modelMessages = await convertToModelMessages(messages);
      console.log('🔄 Converted to model messages:', JSON.stringify(modelMessages, null, 2));

      const result = await generateText({
        model: v4api('gpt-5.2'),
        messages: modelMessages,
        system: `You are a helpful AI writing assistant embedded in a word processor application. 
        You help users with:
        - Writing and editing documents
        - Grammar and style suggestions
        - Content generation and brainstorming
        - Document formatting tips
        - General writing advice
        
        Be concise, helpful, and professional in your responses.`,
      });

      console.log('✅ Response generated:', result.text);

      // Return the complete response
      res.json({ 
        role: 'assistant',
        content: result.text 
      });
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
