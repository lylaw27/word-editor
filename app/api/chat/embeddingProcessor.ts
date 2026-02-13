import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

export interface TextChunk {
  chunkIndex: number;
  text: string;
  section?: string;
}

export interface EmbeddedChunk extends TextChunk {
  embedding: number[];
}

export interface ProcessingProgress {
  stage: 'extracting' | 'chunking' | 'embedding' | 'uploading' | 'done' | 'error';
  message: string;
  progress: number; // 0–100
  totalChunks?: number;
  processedChunks?: number;
}

// ---------- PDF Text Extraction ----------

export async function extractTextFromPDF(filePath: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

// ---------- Text Chunking ----------

// Heading patterns that indicate section/chapter boundaries
const HEADING_PATTERNS = [
  /^#{1,3}\s+(.+)$/m,                          // Markdown headings
  /^(Chapter\s+\d+[.:]\s*.*)$/im,              // "Chapter 1: ..."
  /^(Part\s+\d+[.:]\s*.*)$/im,                 // "Part 1: ..."
  /^(Section\s+[\d.]+[.:]\s*.*)$/im,           // "Section 1.2: ..."
  /^(\d+\.\s+[A-Z].{2,})$/m,                   // "1. Introduction"
  /^(\d+\.\d+\s+[A-Z].{2,})$/m,               // "1.1 Background"
  /^([A-Z][A-Z\s]{4,})$/m,                     // ALL CAPS HEADINGS
];

function detectSectionBoundaries(text: string): { start: number; heading?: string }[] {
  const boundaries: { start: number; heading?: string }[] = [{ start: 0 }];

  for (const pattern of HEADING_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    let match;
    while ((match = globalPattern.exec(text)) !== null) {
      boundaries.push({
        start: match.index,
        heading: match[1]?.trim() || match[0]?.trim(),
      });
    }
  }

  // Deduplicate and sort by position
  boundaries.sort((a, b) => a.start - b.start);
  const deduped: typeof boundaries = [];
  for (const b of boundaries) {
    if (deduped.length === 0 || b.start - deduped[deduped.length - 1].start > 50) {
      deduped.push(b);
    }
  }

  return deduped;
}

/**
 * Split text into chunks by sections/paragraphs.
 * Max chunk size ~1500 tokens (~6000 chars). Overlap of ~200 chars for context.
 */
export function chunkText(
  text: string,
  maxChunkChars = 6000,
  overlapChars = 200
): TextChunk[] {
  const chunks: TextChunk[] = [];

  // Try section-based splitting first
  const sections = detectSectionBoundaries(text);

  if (sections.length > 1) {
    // Split by detected sections
    for (let i = 0; i < sections.length; i++) {
      const start = sections[i].start;
      const end = i + 1 < sections.length ? sections[i + 1].start : text.length;
      const sectionText = text.slice(start, end).trim();

      if (!sectionText) continue;

      // If section is too large, split by paragraphs
      if (sectionText.length > maxChunkChars) {
        const subChunks = splitByParagraphs(sectionText, maxChunkChars, overlapChars);
        for (const sub of subChunks) {
          chunks.push({
            chunkIndex: chunks.length,
            text: sub,
            section: sections[i].heading,
          });
        }
      } else {
        chunks.push({
          chunkIndex: chunks.length,
          text: sectionText,
          section: sections[i].heading,
        });
      }
    }
  } else {
    // No sections detected — split by paragraphs
    const subChunks = splitByParagraphs(text, maxChunkChars, overlapChars);
    for (const sub of subChunks) {
      chunks.push({
        chunkIndex: chunks.length,
        text: sub,
      });
    }
  }

  return chunks;
}

function splitByParagraphs(
  text: string,
  maxChunkChars: number,
  overlapChars: number
): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if (currentChunk.length + trimmed.length + 2 > maxChunkChars && currentChunk) {
      chunks.push(currentChunk.trim());
      // Add overlap from end of previous chunk
      const overlap = currentChunk.slice(-overlapChars);
      currentChunk = overlap + '\n\n' + trimmed;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // If we still have no chunks (no paragraph breaks), split by character count
  if (chunks.length === 0 && text.trim().length > 0) {
    const cleaned = text.trim();
    for (let i = 0; i < cleaned.length; i += maxChunkChars - overlapChars) {
      chunks.push(cleaned.slice(i, i + maxChunkChars).trim());
    }
  }

  return chunks;
}

// ---------- OpenAI Embedding ----------

/**
 * Generate embeddings for a batch of texts using text-embedding-3-small.
 * Processes in batches of 100 (OpenAI limit per request).
 */
export async function generateEmbeddings(
  texts: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<number[][]> {
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const { embeddings } = await embedMany({
      model: openai.embedding('text-embedding-3-small'),
      values: batch,
    });

    allEmbeddings.push(...embeddings);

    onProgress?.(Math.min(i + batchSize, texts.length), texts.length);
  }

  return allEmbeddings;
}

// ---------- Full Pipeline ----------

export async function processAndEmbedPDF(
  filePath: string,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<EmbeddedChunk[]> {
  // 1. Extract text
  onProgress?.({
    stage: 'extracting',
    message: 'Extracting text from PDF...',
    progress: 10,
  });

  const text = await extractTextFromPDF(filePath);

  if (!text.trim()) {
    throw new Error('No text could be extracted from the PDF. It may be image-based or encrypted.');
  }

  // 2. Chunk text
  onProgress?.({
    stage: 'chunking',
    message: 'Splitting text into chunks...',
    progress: 30,
  });

  const chunks = chunkText(text);

  onProgress?.({
    stage: 'embedding',
    message: `Generating embeddings for ${chunks.length} chunks...`,
    progress: 40,
    totalChunks: chunks.length,
    processedChunks: 0,
  });

  // 3. Generate embeddings
  const embeddings = await generateEmbeddings(
    chunks.map((c) => c.text),
    (processed, total) => {
      const embeddingProgress = 40 + (processed / total) * 50;
      onProgress?.({
        stage: 'embedding',
        message: `Embedding chunks ${processed}/${total}...`,
        progress: Math.round(embeddingProgress),
        totalChunks: total,
        processedChunks: processed,
      });
    }
  );

  // 4. Combine chunks with embeddings
  const embeddedChunks: EmbeddedChunk[] = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  onProgress?.({
    stage: 'done',
    message: 'Processing complete!',
    progress: 100,
    totalChunks: chunks.length,
    processedChunks: chunks.length,
  });

  return embeddedChunks;
}
