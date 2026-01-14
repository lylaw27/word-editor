# AI Chat Assistant Setup

This document explains how to set up and use the AI Chat Assistant feature in the Word Editor.

## Features

- **AI-Powered Writing Assistant**: Get help with writing, editing, and formatting documents
- **Real-time Streaming**: Messages stream in real-time using Vercel AI SDK
- **Beautiful UI**: Modern chat interface with blue user bubbles and white AI response bubbles
- **Slide-in Panel**: Elegant slide-in animation from the right side
- **Powered by GPT-4 Turbo**: Latest AI model for high-quality responses

## Setup Instructions

### 1. Get an OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to API Keys section
4. Create a new API key and copy it

### 2. Configure Environment Variables

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

### 3. Run the Application

Start the development server:

```bash
npm run electron:dev
```

The application will:
- Start the Vite dev server on `http://localhost:5173`
- Launch the Express API server on `http://localhost:3001`
- Open the Electron app

### 4. Using the AI Chat Assistant

1. Click the **"AI Chat"** button in the menu bar (top right)
2. The chat panel will slide in from the right
3. Type your message in the input box at the bottom
4. Press Enter or click the send button
5. The AI will respond with helpful suggestions

## Chat Panel Features

- **Welcome Screen**: Friendly introduction when you first open the chat
- **User Messages**: Blue bubbles on the right side
- **AI Responses**: White bubbles with border on the left side
- **Typing Indicator**: Animated dots while AI is thinking
- **Auto-scroll**: Automatically scrolls to newest messages
- **Close Button**: X button in the header to close the panel

## AI Assistant Capabilities

The AI assistant can help you with:

- Writing and editing documents
- Grammar and style suggestions
- Content generation and brainstorming
- Document formatting tips
- General writing advice

## Architecture

### Components

- **ChatPanel.tsx**: Main chat UI component with messages and input
- **MenuBar.tsx**: Updated with chat toggle button
- **App.tsx**: Manages chat panel state

### API

- **api-server.ts**: Express server running on port 3001
- **Endpoint**: `POST /api/chat`
- **Streaming**: Uses Vercel AI SDK's `streamText` function

### UI Components (shadcn-style)

- **Button.tsx**: Reusable button component with variants
- **Input.tsx**: Styled input component
- **Card.tsx**: Card components for structured content
- **ScrollArea.tsx**: Scrollable container for messages

### Dependencies

- `ai`: Vercel AI SDK for streaming chat
- `@ai-sdk/openai`: OpenAI provider for AI SDK
- `express`: API server
- `cors`: Enable CORS for API
- `dotenv`: Load environment variables

## Troubleshooting

### API Key Issues

If you see errors about the API key:
1. Verify your `.env` file exists
2. Check that `OPENAI_API_KEY` is set correctly
3. Restart the application after changing `.env`

### Connection Issues

If the chat doesn't connect:
1. Check that port 3001 is not in use by another application
2. Look for errors in the Electron console
3. Verify the API server started successfully

### Streaming Issues

If messages don't stream properly:
1. Check your internet connection
2. Verify your OpenAI API key has credits
3. Check the browser console for errors

## Cost Considerations

The AI Chat Assistant uses OpenAI's GPT-4 Turbo model, which has associated costs:
- Input: ~$0.01 per 1K tokens
- Output: ~$0.03 per 1K tokens

Monitor your usage on the [OpenAI dashboard](https://platform.openai.com/usage).

## Future Enhancements

Potential improvements for the chat assistant:

- [ ] Save chat history
- [ ] Multiple conversation threads
- [ ] Document context awareness
- [ ] Custom system prompts
- [ ] Model selection (GPT-3.5, GPT-4, etc.)
- [ ] Export chat conversations
- [ ] Voice input/output
