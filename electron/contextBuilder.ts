/**
 * Context Builder
 * 
 * Constructs a rich context window for the AI agent by combining:
 * - Current document content (ProseMirror JSON + plain text)
 * - User selection (if any)
 * - External reference documents (when provided)
 * 
 * This runs on the backend (Node.js) and formats raw context data
 * sent from the frontend into a structured system message for the AI.
 */

export interface UserSelection {
  from: number;
  to: number;
  text: string;
}

export interface ExternalDocument {
  name: string;
  content: string;
  type?: 'reference' | 'context' | 'example' | 'retrieved';
  metadata?: Record<string, any>;
  score?: number; // Similarity score for retrieved documents
}

export interface DocumentContext {
  // Full document as HTML
  documentHtml: string;
  // Plain text version
  documentText: string;
  // Document statistics
  stats: {
    characters: number;
    words: number;
  };
  // User selection (if any)
  selection?: UserSelection;
  // External documents (if any)
  externalDocuments?: ExternalDocument[];
}

/**
 * Format raw context data into DocumentContext
 * This is used on the backend after receiving raw data from frontend
 */
export function formatContextData(
  contextData: DocumentContext
): DocumentContext {
  // Just pass through - the frontend already calculated everything
  // This function exists for future validation/transformation if needed
  return contextData;
}

/**
 * Format context as a system message for the AI
 * This creates a structured prompt that the AI can understand
 */
export function formatContextAsSystemMessage(context: DocumentContext): string {
  const sections: string[] = [];

  // 1. Current Document Section
  sections.push(`# CURRENT DOCUMENT

**Document HTML:**
\`\`\`html
${context.documentHtml || ''}
\`\`\`

**Plain Text Preview:**
${context.documentText || '(empty document)'}

**Statistics:**
- Characters: ${context.stats.characters}
- Words: ${context.stats.words}
`);

  // 2. User Selection Section (if any)
  if (context.selection) {
    sections.push(`# USER SELECTION

The user has selected content at positions ${context.selection.from}-${context.selection.to}:

**Selected Text:**
${context.selection.text}

**Selected Content:**
${context.selection.text}

**IMPORTANT:** When the user has a selection, they likely want to edit or work with this specific area. Prioritize this selection in your response.
`);
  }

  // 3. External Documents Section (if any)
  if (context.externalDocuments && context.externalDocuments.length > 0) {
    const retrievedDocs = context.externalDocuments.filter(doc => doc.type === 'retrieved');
    const otherDocs = context.externalDocuments.filter(doc => doc.type !== 'retrieved');

    if (retrievedDocs.length > 0) {
      sections.push(`# RETRIEVED KNOWLEDGE (RAG)

Found ${retrievedDocs.length} relevant document chunks from the embedded knowledge base:
`);

      retrievedDocs.forEach((doc, index) => {
        sections.push(`## Retrieved Chunk ${index + 1}: ${doc.name}
**Relevance Score:** ${doc.score?.toFixed(3) || 'N/A'}
${doc.metadata?.section ? `**Section:** ${doc.metadata.section}\n` : ''}
${doc.content}

---
`);
      });
    }

    if (otherDocs.length > 0) {
      sections.push(`# EXTERNAL REFERENCE DOCUMENTS

The user has provided ${otherDocs.length} external document(s) for reference:
`);

      otherDocs.forEach((doc, index) => {
        sections.push(`## Document ${index + 1}: ${doc.name}${doc.type ? ` (${doc.type})` : ''}

${doc.content}

${doc.metadata ? `**Metadata:**\n${JSON.stringify(doc.metadata, null, 2)}\n` : ''}
---
`);
      });

      sections.push(`**Instructions:** Use these external documents as reference material, examples, or context for understanding the user's request.
`);
    }
  }

  // 4. Editing Guidelines
  sections.push(`# EDITING GUIDELINES

When the user's message implies ANY change to the document, use the editTool immediately — do not just describe what you would change.

When editing:
1. Look at the Document HTML above and find the exact HTML snippet(s) to change
2. If there's a user selection, focus on that area first — a selection is a strong signal the user wants edits there
3. Use the 'editTool' with oldHtml (exact match from the document) and newHtml (replacement with change markers)
4. Always include visual change tracking in newHtml:
   - Deleted text: <span style="color: #999999; text-decoration: line-through;">deleted</span>
   - New text: <span style="background-color: #d4edda; color: #155724;">new</span>
5. Preserve existing HTML tags and formatting on unchanged content
6. Copy oldHtml exactly from the Document HTML to ensure a match

When the user asks about topics that may exist in embedded documents, use retrievalTool to retrieve relevant knowledge BEFORE responding or editing.
`);

  return sections.join('\n\n');
}

