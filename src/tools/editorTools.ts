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

import { tool, embed } from 'ai';
import { z } from 'zod';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';
import { CohereClient } from 'cohere-ai';
import { searchTool, extractTool } from '@parallel-web/ai-sdk-tools';

/**
 * Tool: Insert text at cursor position
 * Use when user asks to add new content to the document
 */
// export const insertTextTool = tool({
//   description: "Insert text at the current cursor position in the document. Use this when the user asks to add new content.",
//   inputSchema: z.object({
//     text: z.string().describe("The text content to insert into the document")
//   }),
//   // No execute function - we handle this on the frontend
// });

/**
 * Tool: Edit document using HTML search and replace
 *
 * This tool allows the AI to make precise edits anywhere in the document by:
 * 1. Receiving the full document as HTML in the system context
 * 2. Specifying HTML snippets to find and their replacements
 * 3. Including visual change markers in the replacement HTML
 */
export const editTool = tool({
  description: `Make changes to the document. Use this tool ANY TIME the user wants to modify, improve, add to, or restructure the document content — even if they don't explicitly say "edit".

  WHEN TO USE THIS TOOL:
  - User asks to fix grammar, spelling, or punctuation
  - User asks to improve, rewrite, rephrase, or polish text
  - User asks to add new content (paragraphs, sections, sentences)
  - User asks to remove, shorten, or condense content
  - User asks to change tone, style, or formality
  - User asks to restructure, reorder, or reformat content
  - User has selected text and asks you to do something with it
  - ANY request that would result in the document looking different

  CRITICAL WORKFLOW:
  1. The document HTML is already in your system context — analyze it directly
  2. Identify the exact HTML snippet(s) that need to change
  3. For each change, provide the oldHtml to find and the newHtml to replace it with
  4. Include visual change tracking in the newHtml

  HTML SEARCH AND REPLACE:
  - oldHtml: Copy the EXACT HTML from the document context that you want to change. Must be an exact match.
  - newHtml: The replacement HTML with change tracking markup included.

  VISUAL CHANGE TRACKING - CRITICAL:
  Include these markers in your newHtml to show what changed:

  1. DELETED TEXT (strikethrough + gray):
     <span style="color: #999999; text-decoration: line-through;">deleted text</span>

  2. NEW/INSERTED TEXT (green background):
     <span style="background-color: #d4edda; color: #155724;">new text</span>

  3. UNCHANGED TEXT:
     Keep original HTML as-is, no markers needed

  EXAMPLE EDIT:

  Document HTML contains:
  <p>The quick brown fox jumps.</p>

  User asks to replace "brown fox" with "red cat":

  oldHtml: "<p>The quick brown fox jumps.</p>"
  newHtml: "<p>The quick <span style=\"color: #999999; text-decoration: line-through;\">brown fox</span> <span style=\"background-color: #d4edda; color: #155724;\">red cat</span> jumps.</p>"

  IMPORTANT RULES:
  - oldHtml MUST exactly match a portion of the document HTML (copy it precisely from context)
  - Preserve all existing HTML tags and attributes on unchanged content
  - Always include surrounding context in oldHtml to ensure a unique match
  - For adding new content, use an empty oldHtml and set newHtml to the content with an insertAfter target
  - Order does not matter — edits are applied sequentially

  Use this for: improving sections, rewriting paragraphs, fixing grammar, changing tone, restructuring content.`,

  inputSchema: z.object({
    instructions: z.string().describe("The editing instructions provided by the user"),
    edits: z.array(
      z.object({
        oldHtml: z.string().describe("The exact HTML snippet to find in the document (must match exactly)"),
        newHtml: z.string().describe("The replacement HTML with visual change markers (deleted text with strikethrough+gray, new text with green highlight)"),
      })
    ).describe("Array of HTML search-and-replace operations to apply to the document"),
    reasoning: z.string().optional().describe("Brief explanation of the changes being made"),
  }),
});

/**
 * Tool: Search Embedded Knowledge Base (RAG)
 * 
 * Use this tool to search through embedded documents in the knowledge base
 * using semantic similarity. This performs RAG (Retrieval Augmented Generation)
 * to find relevant information from previously embedded PDFs and documents.
 * 
 * The tool will:
 * 1. Convert your query to an embedding
 * 2. Search the vector database for similar content
 * 3. Return top 10 results with similarity score > 0.8
 * 4. Add retrieved chunks to the context for your response
 * 
 * Use this when:
 * - User asks about information that might be in embedded documents
 * - You need additional context from the knowledge base
 * - User references "documents", "knowledge base", or "embedded PDFs"
 * 
 * NOTE: The current document context is automatically provided.
 * Use this ONLY to search the embedded knowledge base.
 */
export const retrievalTool = tool({
  description: `Search the embedded knowledge base for relevant information using semantic similarity (RAG). 
  
  ⚠️ CRITICAL RULE: NEVER ask the user for information that might exist in the knowledge base. ALWAYS execute this tool FIRST when you need information, don't have context, or are uncertain about something. Do NOT ask clarifying questions - search first.
  
  MANDATORY USAGE - Execute this tool immediately when:
  - You don't know the answer to the user's question or request
  - You lack information to complete the user's request
  - User asks about ANY specific topic, term, concept, or domain that you're unfamiliar with
  - User asks a question that requires information beyond what's in the current document
  - User wants to add/write content about something that MIGHT be documented in the knowledge base
  - User references uploaded PDFs, reports, guides, policies, or external documents
  - User asks to fact-check, verify, or align content with source material
  - User says things like "based on the docs", "according to our materials", "what do we have on..."
  - You need additional context or background before making edits
  - User asks you to incorporate domain-specific knowledge (technical terms, company policies, procedures, processes)
  - User asks you to write about ANYTHING that could potentially be in embedded documents
  
  BEHAVIOR RULES:
  1. DEFAULT TO SEARCH: If there's even a small chance information exists in the knowledge base, use this tool first
  2. NEVER ASK USER FIRST: Don't ask "can you provide more details?" or "what would you like me to include?" - search the knowledge base first
  3. SEARCH THEN RESPOND: Only after retrievalTool returns no results (empty results array) should you consider asking the user
  4. BE PROACTIVE: Assume information exists in the knowledge base until proven otherwise
  
  WHEN NOT TO USE (rare exceptions):
  - The answer is clearly and completely available in the current document context (already provided in system message)
  - The user is asking for general writing advice or creative content that doesn't require factual information
  - The user explicitly asks you NOT to search the knowledge base
  - You're absolutely certain the information doesn't exist in any uploaded documents
  
  CRITICAL WORKFLOW - ALWAYS SEARCH BEFORE EDIT/RESPOND:
  - User: "Add a section about X" → Use retrievalTool FIRST with query "X", then editTool with retrieved info
  - User: "Write about [topic]" → Use retrievalTool FIRST with query "[topic]", then editTool to incorporate it
  - User: "What is [concept]?" → Use retrievalTool FIRST with query "[concept]", then respond with findings
  - User: "Update to align with guidelines" → Use retrievalTool FIRST with query "guidelines", then editTool
  - User asks about domain-specific terms → Use retrievalTool FIRST before responding
  
  Returns the top 10 most relevant chunks ranked by relevance.`,
  inputSchema: z.object({
    query: z.string().describe("The EXACT search terms or keywords from the user's message - DO NOT rephrase or elaborate. Preserve the user's original phrasing and key terms for best search results. Example: if user says 'authentication flow', use 'authentication flow', not 'how authentication works'."),
    reasoning: z.string().optional().describe("Why you're searching the knowledge base (helps with debugging)"),
  }),
  execute: async ({ query, reasoning }) => {
    console.log('🔍 Executing retrievalTool (RAG) on backend:', { query, reasoning });
    
    try {
      // Initialize Convex client
      const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) {
        throw new Error('CONVEX_URL is not set');
      }
      const convex = new ConvexHttpClient(convexUrl);

      // Generate embedding for the query using AI SDK embed
      console.log('🧮 Generating query embedding...');
      const { embedding: queryEmbedding } = await embed({
        model: 'openai/text-embedding-3-small',
        value: query,
      });
      console.log('✅ Query embedding generated, dimension:', queryEmbedding.length);

      // Search in Convex vector database (get more candidates for reranking)
      console.log('🔎 Searching vector database...');
      const results = await convex.action(api.embeddings.searchByEmbedding, {
        queryEmbedding,
        limit: 50, // Get more candidates for reranking
        minScore: 0, // Lower threshold to get more results for reranking
      });

      console.log('📚 Initial Vector Search Results:', {
        query,
        resultCount: results.length,
        topScores: results.slice(0, 3).map((r: any) => r.score?.toFixed(3)),
      });

      if (results.length === 0) {
        console.log('⚠️  No results found in vector search');
        return {
          success: true,
          message: 'No relevant documents found in the knowledge base',
          results: [],
          query,
        };
      }

      // Initialize Cohere client for reranking
      const cohereApiKey = process.env.COHERE_API_KEY;
      if (!cohereApiKey) {
        console.warn('⚠️  COHERE_API_KEY not set, skipping reranking');
        // Fall back to vector search results only
        const formattedResults = results.slice(0, 10).map((result: any, index: number) => ({
          rank: index + 1,
          score: result.score,
          document: result.documentName || 'Unknown',
          section: result.section || 'N/A',
          text: result.text,
        }));
        
        return {
          success: true,
          message: `Found ${formattedResults.length} chunks (no reranking)`,
          results: formattedResults,
          query,
        };
      }

      // Rerank results with Cohere
      console.log('🔁 Reranking results with Cohere...');
      const cohere = new CohereClient({
        token: cohereApiKey,
      });

      const reranked = await cohere.v2.rerank({
        query: query,
        documents: results.map((r: any) => r.text),
        topN: 10,
        model: 'rerank-english-v3.0',
      });

      console.log('🎯 Reranking complete:', {
        originalCount: results.length,
        rerankedCount: reranked.results.length,
        topRerankScores: reranked.results.slice(0, 3).map(r => r.relevanceScore.toFixed(3)),
      });

      // Merge rerank scores with original results
      const rerankedResults = reranked.results
        .map((rerankResult: any) => {
          const originalResult = results[rerankResult.index];
          return {
            rank: rerankResult.index + 1,
            vectorScore: originalResult.score,
            rerankScore: rerankResult.relevanceScore,
            document: originalResult.documentName || 'Unknown',
            section: originalResult.section || 'N/A',
            text: originalResult.text,
          };
        })
        .filter((r: any) => r.rerankScore > 0.2); // Lower threshold to 0.2

      console.log('✅ Final results after reranking:');
      rerankedResults.forEach((result: any, index: number) => {
        console.log(`📄 #${index + 1}:`, {
          document: result.document,
          section: result.section,
          vectorScore: result.vectorScore?.toFixed(3),
          rerankScore: result.rerankScore?.toFixed(3),
          textPreview: result.text?.substring(0, 80) + '...',
        });
      });

      return {
        success: true,
        message: `Found ${rerankedResults.length} highly relevant chunks (reranked)`,
        results: rerankedResults,
        query,
      };
    } catch (error: any) {
      console.error('❌ RAG search failed:', error);
      return {
        success: false,
        error: `Failed to search knowledge base: ${error.message}`,
      };
    }
  },
});

/**
 * Export all tools as a single object
 * This format is used by generateText/streamText in AI SDK
 */
export const editorTools = {
    editTool: editTool,
    retrievalTool: retrievalTool,
    webSearch: searchTool,
    webExtract: extractTool,
} as const;
