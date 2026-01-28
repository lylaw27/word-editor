import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { streamText, convertToModelMessages, type UIMessage, stepCountIs } from 'ai';
import { editorTools } from '../src/tools/editorTools';

// Load environment variables
dotenv.config();

export function createAPIServer(port = 3001) {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  app.post('/api/chat', async (req, res) => {
    try {
      const { 
        messages, 
        context 
      }: { 
        messages: UIMessage[]; 
        context?: { documentText: string; selectedText: string }; 
      } = req.body;
      
      console.log('📨 Received messages:', JSON.stringify(messages, null, 2));
      console.log('🔧 Available tools:', Object.keys(editorTools));
      console.log('📄 Context:', context);

      // Convert UIMessage[] to ModelMessage[] format
      const modelMessages = await convertToModelMessages(messages);

      // Build system prompt with context if available
      let systemPrompt = `You are a helpful AI writing assistant embedded in a word processor application. 
        You help users with:
        - Writing and editing documents
        - Grammar and style suggestions
        - Content generation and brainstorming
        - Document formatting tips
        - General writing advice
        
        Be concise, helpful, and professional in your responses.
        
        CRITICAL TOOL USAGE RULES:
        1. If the user has text selected (see 'Currently selected text' context), and asks to "rewrite", "fix", "improve", "change", or "edit" it (e.g., "rewrite this sentence"), you MUST use the 'replace_selection' tool to update the text directly in the editor.
        2. Do not just print the rewritten text in the chat response unless explicitly asked to "show" or "tell" the new version. Prefer acting on the document.
        3. If there is no selection but the user asks to "rewrite this sentence", assume they mean the sentence relative to the cursor or the last sentence mentioned, but prioritize 'replace_selection' if a selection exists.`;

      // Add document context to system prompt if available
      if (context) {
        systemPrompt += `\n\nCurrent document context:`;
        if (context.documentText) {
          systemPrompt += `\n- Full document text: "${context.documentText}"`;
        }
        if (context.selectedText) {
          systemPrompt += `\n- Currently selected text: "${context.selectedText}"`;
        }
      }

      // Use streamText for streaming responses (AI SDK standard)
      const result = streamText({
        model: 'openai/gpt-5.2',
        messages: modelMessages,
        system: systemPrompt,
        tools: editorTools,  // Use editorTools directly from import
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

  const server = app.listen(port, () => {
    console.log(`API server running on http://localhost:${port}`);
  });

  return server;
}
