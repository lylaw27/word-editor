# AI Agent Tool System - Setup Guide

This guide explains how the AI agent tool system works in your word editor application, following the **AI SDK** standards.

## 📁 File Structure

```
src/
├── tools/
│   ├── editorTools.ts         # Tool definitions using AI SDK tool() helper
│   └── executeEditorTool.ts   # Tool executor (how to execute in TipTap)
├── context/
│   └── TiptapContext.tsx      # Shares editor instance across components
├── components/
│   ├── ChatPanel.tsx          # AI chat interface (sends tools & executes them)
│   └── TiptapEditor.tsx       # Editor component (registers itself)
└── electron/
    └── api-server.ts          # Backend API (handles AI requests with tools)
```

## 🔧 How It Works (AI SDK Method)

### 1. Tool Definition (`editorTools.ts`)
- Uses AI SDK's `tool()` helper function from the 'ai' package
- Each tool is defined with:
  - **description**: Tells AI when to use it
  - **inputSchema**: Zod schema that defines and validates inputs
  - **execute**: Optional (we handle execution on frontend)

Example:
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const insertTextTool = tool({
  description: "Insert text at the current cursor position",
  inputSchema: z.object({
    text: z.string().describe("The text to insert")
  }),
});
```

### 2. Tool Executor (`executeEditorTool.ts`)
- Maps tool names to actual TipTap editor commands
- Takes the AI's tool request and executes it
- Returns success/failure and optional results

### 3. Context Sharing (`TiptapContext.tsx`)
- Allows ChatPanel to access the TipTap editor instance
- TiptapEditor registers itself when it mounts
- ChatPanel retrieves it to execute tools

### 4. Chat Panel Integration (`ChatPanel.tsx`)
- Sends tools object to AI with each request
- Includes document context (full text, selected text)
- Executes any tool calls returned by the AI
- Displays AI responses to the user

### 5. Backend API (`api-server.ts`)
- Receives chat messages, tools object, and context
- Passes tools to AI model using AI SDK's `generateText()`
- AI decides which tools to use (if any)
- Returns response + tool calls to frontend

## 🚀 Flow Diagram

```
User types message in ChatPanel
         ↓
ChatPanel gathers context:
  - Document text
  - Selected text
  - Tools object (editorTools)
         ↓
Sends to API Server (/api/chat)
         ↓
API passes to AI model with tools using generateText()
         ↓
AI analyzes request & decides:
  - Should I use a tool?
  - Which tool(s)?
  - What parameters?
         ↓
AI returns: text response + toolCalls array
         ↓
ChatPanel receives response
         ↓
For each tool call:
  executeEditorTool() runs the action
         ↓
User sees changes in editor + AI message
```

## 💡 Example Interaction

**User:** "Make the selected text bold"

1. ChatPanel sends:
   - Message: "Make the selected text bold"
   - Context: `{ selectedText: "Hello World" }`
   - Tools: `{ format_text: { description: "...", inputSchema: ... } }`

2. AI SDK calls generateText() with tools:
   - AI decides to use `format_text` tool
   - Parameters: `{ format: "bold" }`

3. Backend returns:
   - Content: "I've made the selected text bold."
   - Tool calls: `[{ toolName: "format_text", args: { format: "bold" }}]`

4. ChatPanel executes:
   - Calls `executeEditorTool(editor, "format_text", { format: "bold" })`
   - Editor applies bold formatting
   - Shows AI message to user

## 🎯 Adding New Tools (AI SDK Way)

Want to add a new capability? Here's how:

### Step 1: Define the tool in `editorTools.ts`

```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const changeTextColorTool = tool({
  description: "Change the color of selected text",
  inputSchema: z.object({
    color: z.enum(["red", "blue", "green"])
      .describe("Color to apply")
  }),
});

// Add to exports
export const editorTools = {
  // ... existing tools
  change_text_color: changeTextColorTool,
} as const;
```

### Step 2: Implement execution in `executeEditorTool.ts`

```typescript
case 'change_text_color':
  // You'd need to add a Color extension to TipTap first
  editor.chain().focus().setColor(parameters.color).run();
  return { success: true };
```

### Step 3: Test it!

Just chat with the AI: "Make this text red"

## 🔍 Debugging

The system includes extensive logging:

- **Frontend (ChatPanel):**
  - `📤 Sending message:` - What's being sent to API
  - `📥 Received response:` - AI's response
  - `🔧 Executing tool calls:` - Tools being executed

- **Backend (api-server):**
  - `📨 Received messages:` - Incoming chat messages
  - `🔧 Available tools:` - Tools provided to AI
  - `📄 Context:` - Document context
  - `✅ Response generated:` - AI's final response
  - `🔧 Tool calls made:` - Which tools AI decided to use

Check the console to see exactly what's happening!

## 🛠️ Current Available Tools

1. **insert_text** - Add new content at cursor
2. **replace_selection** - Replace selected text
3. **format_text** - Apply bold, italic, strikethrough
4. **set_heading** - Convert to heading (H1-H3)
5. **create_list** - Make bullet or numbered lists
6. **get_selected_text** - Read what's selected
7. **get_document_text** - Read entire document

## 📝 Key AI SDK Concepts

### Tool Format
According to AI SDK documentation, tools should be:
- Defined using `tool()` helper from 'ai'
- Use Zod schemas for input validation
- Passed as an **object** (not array) to `generateText()`

### Tool Calls Response
The AI SDK returns tool calls in this format:
```typescript
{
  toolName: string;  // Name of the tool to call
  args: object;      // Arguments (validated against inputSchema)
}
```

### maxSteps
When using tools, set `maxSteps` to allow multi-step reasoning:
```typescript
await generateText({
  model: v4api('gpt-5.2'),
  messages: modelMessages,
  tools: editorTools,
  maxSteps: 5  // Allow AI to make up to 5 tool calls
});
```

This allows the AI to use multiple tools and iterate if needed!
