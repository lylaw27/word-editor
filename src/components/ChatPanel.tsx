import { useRef, useEffect, useState, FormEvent } from 'react';
import { X, Send, Bot, User, Trash2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { ScrollArea } from './ui/ScrollArea';
import { cn } from '../lib/utils';
import { useTiptap } from '../context/TiptapContext';
import { executeEditorTool } from '../tools/executeEditorTool';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}


export default function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  // Get the TipTap editor instance from context
  const { editor } = useTiptap();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  // Use the AI SDK's useChat hook for managing chat state and streaming
  const { messages, sendMessage, status, error, addToolOutput, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    // Tool definitions are server-side, but execution happens here client-side
    // No need to send tool schemas - just handle execution when LLM calls them
    // Automatically submit when all tool results are available
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // Handle client-side tool execution (only editTool - readTool runs on backend)
    async onToolCall({ toolCall }) {
      // Check if it's a dynamic tool first for proper type narrowing
      if (toolCall.dynamic) {
        return;
      }

      console.log('🔧 Executing client-side tool:', toolCall.toolName, toolCall.input);
      
      // Only execute editTool on client - retrievalTool is handled by backend
      if (toolCall.toolName !== 'editTool') {
        console.log('⏭️  Skipping - tool runs on backend');
        return;
      }

      // Execute the tool in the TipTap editor
      const result = await executeEditorTool(
        editor,
        toolCall.toolName,
        toolCall.input
      );
      
      console.log(`Tool ${toolCall.toolName} executed:`, result);
      
      // Add tool output (no await to avoid deadlocks)
      addToolOutput({
        tool: toolCall.toolName as any,
        toolCallId: toolCall.toolCallId,
        output: result.result || 'Success',
      });
    },
    onError: (err) => {
      console.error('❌ Chat error:', err);
    },
  });

  // Debug logging
  useEffect(() => {
    console.log('💬 Messages updated:', messages);
  }, [messages]);

  useEffect(() => {
    console.log('📊 Status:', status);
  }, [status]);

  useEffect(() => {
    if (error) {
      console.error('❌ Chat error:', error);
    }
  }, [error]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle form submission using AI SDK's sendMessage
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== 'ready') return;

    const messageText = input.trim();
    console.log('📤 Sending message:', messageText);
    
    // Extract current document context
    const context = editor ? (() => {
      const documentHtml = editor.getHTML();
      const documentText = editor.getText();
      const { from, to } = editor.state.selection;
      const hasSelection = from !== to;

      // Get selection data if exists
      const selection = hasSelection ? {
        from,
        to,
        text: editor.state.doc.textBetween(from, to, ' '),
      } : undefined;

      // Calculate statistics
      const stats = {
        characters: documentText.length,
        words: documentText.split(/\s+/).filter(w => w.length > 0).length,
      };

      return {
        documentHtml,
        documentText,
        stats,
        selection,
      };
    })() : null;

    // Send message with context data
    sendMessage({ 
      text: messageText 
    }, {
      body: { context } // Pass context in the request body
    });
    
    setInput('');
  };

  return (
    <div
      className={cn(
        "bg-white border-l border-gray-200 shadow-2xl transform transition-all duration-300 ease-in-out flex flex-col flex-shrink-0",
        isOpen ? "w-96 translate-x-0" : "w-0 translate-x-full overflow-hidden"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="flex items-center gap-2 text-white">
          <Bot size={20} />
          <h2 className="font-semibold">AI Writing Assistant</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMessages([])}
            className="text-white hover:bg-blue-700 rounded p-1 transition-colors"
            aria-label="Clear chat"
            disabled={messages.length === 0}
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-700 rounded p-1 transition-colors"
            aria-label="Close chat panel"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot size={48} className="text-blue-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Welcome to AI Assistant
            </h3>
            <p className="text-sm text-gray-500">
              I'm here to help you with writing, editing, and formatting your documents.
              Ask me anything!
            </p>
          </div>
        )}

        {messages.map((message) => {
          return (
            <div
              key={message.id}
              className={cn(
                "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
                message.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
              )}
              
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 shadow-sm",
                  message.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-none'
                    : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
                )}
              >
                {/* Render message parts (AI SDK format with parts array) */}
                {message.parts.map((part, index) => {
                  // Render text parts
                  if (part.type === 'text') {
                    return (
                      <p key={index} className="text-sm whitespace-pre-wrap break-words">
                        {part.text}
                      </p>
                    );
                  }

                  // Handle typed tool parts (tool-editTool, tool-retrievalTool, etc.)
                  // Check if part type starts with 'tool-'
                  if (part.type == 'tool-editTool' ||
                      part.type == 'tool-retrievalTool' ||
                      part.type == 'tool-webSearch' ||
                      part.type == 'tool-webExtract') {
                    const callId = part.toolCallId;
                    const toolName = part.type.replace('tool-', '');
                    
                    switch (part.state) {
                      case 'input-streaming':
                        return (
                          <div key={callId} className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <div className="flex items-center gap-1 font-semibold text-blue-700">
                              <span>🔧</span>
                              <span>Calling: {toolName}</span>
                            </div>
                            <pre className="mt-1 text-blue-600 whitespace-pre-wrap break-words">
                              {JSON.stringify(part.input, null, 2)}
                            </pre>
                          </div>
                        );
                      
                      case 'input-available':
                        return (
                          <div key={callId} className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded-lg p-2">
                            <div className="flex items-center gap-1 font-semibold text-blue-700">
                              <span>🔧</span>
                              <span>Tool: {toolName}</span>
                            </div>
                            <pre className="mt-1 text-blue-600 whitespace-pre-wrap break-words">
                              {JSON.stringify(part.input, null, 2)}
                            </pre>
                          </div>
                        );
                      
                      case 'output-available':
                        return (
                          <div key={callId} className="mt-2 text-xs bg-green-50 border border-green-200 rounded-lg p-2">
                            <div className="flex items-center gap-1 font-semibold text-green-700">
                              <span>✓</span>
                              <span>Result: {toolName}</span>
                            </div>
                            <pre className="mt-1 text-green-600 whitespace-pre-wrap break-words">
                              {typeof part.output === 'string' 
                                ? part.output 
                                : JSON.stringify(part.output, null, 2)}
                            </pre>
                          </div>
                        );
                      
                      case 'output-error':
                        return (
                          <div key={callId} className="mt-2 text-xs bg-red-50 border border-red-200 rounded-lg p-2">
                            <div className="flex items-center gap-1 font-semibold text-red-700">
                              <span>❌</span>
                              <span>Error: {toolName}</span>
                            </div>
                            <p className="mt-1 text-red-600">{part.errorText}</p>
                          </div>
                        );
                    }
                  }

                  return null;
                })}
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                  <User size={16} className="text-white" />
                </div>
              )}
            </div>
          );
        })}

        {(status === 'submitted' || status === 'streaming') && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-none px-4 py-2 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-none px-4 py-2 shadow-sm">
              <p className="text-sm text-red-700">
                Sorry, I encountered an error. Please try again.
              </p>
            </div>
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            disabled={status !== 'ready'}
            className="flex-1"
            autoFocus
          />
          <Button
            type="submit"
            disabled={status !== 'ready' || !input.trim()}
            size="icon"
            className="flex-shrink-0"
          >
            <Send size={18} />
          </Button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Powered by GPT-4 Turbo
        </p>
      </div>
    </div>
  );
}
