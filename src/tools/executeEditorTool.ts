/**
 * Tool Executor
 * 
 * This file contains the logic to actually execute the tools in the TipTap editor.
 * When the AI decides to use a tool, this function maps the tool name to the
 * corresponding editor command.
 * 
 * Each case handles a different tool and translates the AI's request into
 * actual editor commands using TipTap's API.
 */

import { Editor } from '@tiptap/react';

/**
 * Interface for tool execution results
 * - success: whether the tool executed successfully
 * - result: optional data returned by the tool (e.g., text from get_selected_text)
 * - error: optional error message if execution failed
 */
interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * Execute an editor tool based on its name and parameters
 * 
 * @param editor - The TipTap editor instance
 * @param toolName - The name of the tool to execute
 * @param parameters - The parameters passed to the tool (from AI)
 * @returns Result of the tool execution
 */
export function executeEditorTool(
  editor: Editor | null,
  toolName: string,
  parameters: any
): ToolExecutionResult {
  // Safety check: make sure we have an editor instance
  if (!editor) {
    return { 
      success: false, 
      error: 'Editor not initialized' 
    };
  }

  try {
    switch (toolName) {
      // Insert text at cursor position
      case 'insert_text':
        editor.commands.insertContent(parameters.text);
        return { success: true };

      // Replace currently selected text
      case 'replace_selection':
        // First delete the selection, then insert new text
        editor.chain()
          .focus()
          .deleteSelection()
          .insertContent(parameters.newText)
          .run();
        return { success: true };

      // Apply formatting to selected text
      case 'format_text':
        switch (parameters.format) {
          case 'bold':
            editor.chain().focus().toggleBold().run();
            break;
          case 'italic':
            editor.chain().focus().toggleItalic().run();
            break;
          case 'underline':
            // Note: You may need to add the Underline extension to TipTap
            // editor.chain().focus().toggleUnderline().run();
            console.warn('Underline not yet implemented');
            break;
          case 'strikethrough':
            editor.chain().focus().toggleStrike().run();
            break;
        }
        return { success: true };

      // Convert current paragraph to heading
      case 'set_heading':
        // Convert string to number for heading level
        const level = parseInt(parameters.level) as 1 | 2 | 3;
        editor.chain()
          .focus()
          .setHeading({ level })
          .run();
        return { success: true };

      // Create a list (bullet or numbered)
      case 'create_list':
        if (parameters.type === 'bullet') {
          editor.chain().focus().toggleBulletList().run();
        } else if (parameters.type === 'ordered') {
          editor.chain().focus().toggleOrderedList().run();
        }
        return { success: true };

      // Get selected text from the editor
      case 'get_selected_text':
        const { from, to } = editor.state.selection;
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        return { 
          success: true, 
          result: selectedText 
        };

      // Get all document text
      case 'get_document_text':
        const fullText = editor.state.doc.textContent;
        return { 
          success: true, 
          result: fullText 
        };

      // Unknown tool requested
      default:
        return { 
          success: false, 
          error: `Unknown tool: ${toolName}` 
        };
    }
  } catch (error) {
    // Catch any errors during execution
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
