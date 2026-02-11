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
 * @param onContextUpdate - Optional callback to update context with retrieved documents
 * @returns Result of the tool execution
 */
export function executeEditorTool(
  editor: Editor | null,
  toolName: string,
  parameters: any
): ToolExecutionResult | Promise<ToolExecutionResult> {
  // Safety check: make sure we have an editor instance
  if (!editor) {
    return { 
      success: false, 
      error: 'Editor not initialized' 
    };
  }

  try {
    switch (toolName) {
      // Execute HTML search-and-replace edit
      case 'editTool':
        if (!parameters.edits || !Array.isArray(parameters.edits)) {
          return {
            success: false,
            error: 'Invalid edits parameter: expected array of {oldHtml, newHtml} operations'
          };
        }

        const results: { success: boolean; error?: string }[] = [];
        let successCount = 0;
        let failCount = 0;

        // Get the current document HTML
        let currentHtml = editor.getHTML();

        // Apply each search-and-replace operation sequentially
        for (const edit of parameters.edits) {
          const { oldHtml, newHtml } = edit;

          if (oldHtml === undefined || newHtml === undefined) {
            results.push({
              success: false,
              error: 'oldHtml and newHtml are required'
            });
            failCount++;
            continue;
          }

          try {
            if (oldHtml === '') {
              // Empty oldHtml means append newHtml at the end
              currentHtml += newHtml;
              results.push({ success: true });
              successCount++;
            } else if (currentHtml.includes(oldHtml)) {
              currentHtml = currentHtml.replace(oldHtml, newHtml);
              results.push({ success: true });
              successCount++;
            } else {
              results.push({
                success: false,
                error: `Could not find oldHtml in document: "${oldHtml.substring(0, 80)}..."`
              });
              failCount++;
            }
          } catch (error) {
            results.push({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            failCount++;
          }
        }

        // Apply the final HTML to the editor
        if (successCount > 0) {
          try {
            editor.commands.setContent(currentHtml);
          } catch (error) {
            return {
              success: false,
              error: `Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
          }
        }

        return {
          success: successCount > 0,
          result: {
            message: `Applied ${successCount} edit(s), ${failCount} failed`,
            details: results,
            reasoning: parameters.reasoning
          }
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
