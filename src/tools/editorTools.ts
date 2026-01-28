/**
 * Editor Tools Schema
 * 
 * This file defines the available tools that the AI agent can use to interact
 * with the TipTap editor using the AI SDK's tool() helper.
 * 
 * Each tool is created using the tool() function from 'ai' with:
 * - description: explains what the tool does (helps AI understand when to use it)
 * - inputSchema: Zod schema that defines and validates the tool inputs
 * - execute: optional async function (we handle execution on frontend, so not needed here)
 * 
 * These tools follow the AI SDK standard format.
 */

import { tool } from 'ai';
import { z } from 'zod';

/**
 * Tool: Insert text at cursor position
 * Use when user asks to add new content to the document
 */
export const insertTextTool = tool({
  description: "Insert text at the current cursor position in the document. Use this when the user asks to add new content.",
  inputSchema: z.object({
    text: z.string().describe("The text content to insert into the document")
  }),
  // No execute function - we handle this on the frontend
});

/**
 * Tool: Replace selected text
 * Use when user asks to change or edit existing content
 */
export const replaceSelectionTool = tool({
  description: "Replace the currently selected text with new text. Use this when user asks to change or edit existing content.",
  inputSchema: z.object({
    newText: z.string().describe("The new text that will replace the current selection")
  }),
});

/**
 * Tool: Apply text formatting
 * Use when user wants to make text bold, italic, etc.
 */
export const formatTextTool = tool({
  description: "Apply formatting to the currently selected text (bold, italic, underline, or strikethrough).",
  inputSchema: z.object({
    format: z.enum(["bold", "italic", "underline", "strikethrough"])
      .describe("The type of formatting to apply")
  }),
});

/**
 * Tool: Create heading
 * Use when user wants section titles or headers
 */
export const setHeadingTool = tool({
  description: "Convert the current paragraph to a heading. Use when user wants to create section titles or headers.",
  inputSchema: z.object({
    level: z.enum(["1", "2", "3"])
      .describe("Heading level: 1 (largest) to 3 (smallest)")
  }),
});

/**
 * Tool: Create list
 * Use when user wants to organize items
 */
export const createListTool = tool({
  description: "Create a bullet or numbered list. Use when user wants to organize items.",
  inputSchema: z.object({
    type: z.enum(["bullet", "ordered"])
      .describe("Type of list: 'bullet' for bullet points, 'ordered' for numbered list")
  }),
});

/**
 * Tool: Get selected text
 * Use to read what user has highlighted
 */
export const getSelectedTextTool = tool({
  description: "Get the currently selected text from the document. Use this to read what the user has highlighted.",
  inputSchema: z.object({}),
});

/**
 * Tool: Get full document text
 * Use to understand the full context of the document
 */
export const getDocumentTextTool = tool({
  description: "Get all the text content from the entire document. Use this to understand the full context of what the user has written.",
  inputSchema: z.object({}),
});

/**
 * Export all tools as a single object
 * This format is used by generateText/streamText in AI SDK
 */
export const editorTools = {
  insert_text: insertTextTool,
  replace_selection: replaceSelectionTool,
  format_text: formatTextTool,
  set_heading: setHeadingTool,
  create_list: createListTool,
  get_selected_text: getSelectedTextTool,
  get_document_text: getDocumentTextTool,
} as const;
