# Quick Start Guide - AI Chat Feature

## 🚀 Get Started in 3 Steps

### Step 1: Install Dependencies (Already Done!)
All necessary packages have been installed:
- ✅ Vercel AI SDK (`ai`)
- ✅ OpenAI provider (`@ai-sdk/openai`)
- ✅ Express server
- ✅ shadcn/ui utilities

### Step 2: Add Your OpenAI API Key

1. Open the `.env` file in the project root
2. Replace `your_openai_api_key_here` with your actual OpenAI API key:
   ```
   OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
   ```
3. Save the file

**Don't have an API key?** Get one at [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

### Step 3: Run the Application

```bash
npm run electron:dev
```

That's it! 🎉

## 📖 How to Use

1. **Open Chat**: Click the "AI Chat" button in the top-right menu bar
2. **Ask Questions**: Type your message in the input box
3. **Get Responses**: The AI will stream responses in real-time
4. **Close Chat**: Click the X button or click "AI Chat" again

## 💬 What Can the AI Do?

- Help write and edit your documents
- Suggest grammar and style improvements
- Generate content ideas
- Provide writing tips
- Answer questions about formatting

## 🎨 Features

- **Beautiful UI**: Modern chat interface with smooth animations
- **Real-time Streaming**: See responses as they're generated
- **Context-Aware**: AI knows it's a writing assistant
- **Slide-in Panel**: Clean, non-intrusive design
- **Blue/White Bubbles**: User messages in blue, AI responses in white

## 📁 What Was Added

### New Files Created:
1. **src/components/ChatPanel.tsx** - Main chat interface
2. **src/components/ui/** - shadcn-style components (Button, Input, Card, ScrollArea)
3. **src/lib/utils.ts** - Utility functions
4. **src/api/api-server.ts** - Express API server for chat
5. **.env** - Environment variables (add your API key here!)
6. **AI_CHAT_SETUP.md** - Detailed documentation

### Modified Files:
1. **src/App.tsx** - Added chat panel state and component
2. **src/components/MenuBar.tsx** - Added chat toggle button
3. **electron/main.ts** - Added API server startup
4. **src/index.css** - Added animations for chat
5. **package.json** - Added new dependencies

## 🔧 Troubleshooting

**"Cannot find module 'ai/react'"** - This is a VS Code issue that will resolve when you run the app. The module is installed correctly.

**Chat not connecting** - Make sure:
- Your `.env` file has a valid OpenAI API key
- Port 3001 is not in use
- You've restarted the app after adding the API key

**No responses from AI** - Check:
- Your OpenAI API key has credits
- Internet connection is working
- Check the Electron console for errors

## 💡 Tips

- The AI works best with clear, specific questions
- You can ask it to rewrite, summarize, or expand text
- Try asking for different writing styles
- The chat history persists during your session

## 🎯 Next Steps

Now that the AI chat is set up, you can:
1. Customize the system prompt in `src/api/api-server.ts`
2. Add more AI capabilities
3. Save chat history
4. Add document context awareness

Enjoy your new AI writing assistant! ✨
