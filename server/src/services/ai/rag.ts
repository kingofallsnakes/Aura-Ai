import { supabaseAdmin } from '../../config/supabase';
import { aiService, AIMessage } from './providers';
import logger from '../../config/logger';
import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

interface DocumentChunk {
  content: string;
  metadata: {
    source: string;
    page?: number;
    chunkIndex: number;
  };
}

// ─── Document Parsing ───────────────────────────────────────────────
export async function parseDocument(filePath: string, mimeType: string): Promise<string> {
  const buffer = fs.readFileSync(filePath);

  switch (mimeType) {
    case 'application/pdf': {
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    }
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    case 'text/plain':
    case 'text/markdown': {
      return buffer.toString('utf-8');
    }
    default:
      throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

// ─── Text Chunking ──────────────────────────────────────────────────
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200,
  source: string = ''
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: { source, chunkIndex },
      });
      chunkIndex++;

      // Keep overlap
      const words = currentChunk.split(' ');
      const overlapWords = words.slice(-Math.floor(overlap / 5));
      currentChunk = overlapWords.join(' ') + ' ' + sentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: { source, chunkIndex },
    });
  }

  return chunks;
}

// ─── Simple Embedding (TF-IDF-like keyword extraction) ──────────────
// For production, use a proper embedding model. This uses keyword matching
// as a free, zero-dependency alternative.
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
    'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
    'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
    'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
    'or', 'if', 'while', 'about', 'up', 'it', 'its', 'this', 'that',
    'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your', 'he',
    'him', 'his', 'she', 'her', 'they', 'them', 'their', 'what', 'which',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));
}

function computeSimilarity(queryKeywords: string[], chunkKeywords: string[]): number {
  const querySet = new Set(queryKeywords);
  const chunkSet = new Set(chunkKeywords);
  let intersection = 0;

  for (const word of querySet) {
    if (chunkSet.has(word)) intersection++;
  }

  const union = new Set([...querySet, ...chunkSet]).size;
  return union > 0 ? intersection / union : 0;
}

// ─── RAG Pipeline ───────────────────────────────────────────────────
export class RAGService {
  // Store document and chunks in Supabase
  async ingestDocument(
    userId: string,
    documentId: string,
    filePath: string,
    fileName: string,
    mimeType: string
  ): Promise<void> {
    try {
      // Parse the document
      const text = await parseDocument(filePath, mimeType);

      // Update document with extracted content
      await supabaseAdmin
        .from('uploaded_documents')
        .update({ extracted_text: text, status: 'processed' })
        .eq('id', documentId);

      // Chunk the text
      const chunks = chunkText(text, 1000, 200, fileName);

      // Store chunks
      const chunkRecords = chunks.map((chunk) => ({
        document_id: documentId,
        user_id: userId,
        content: chunk.content,
        chunk_index: chunk.metadata.chunkIndex,
        keywords: extractKeywords(chunk.content),
        metadata: chunk.metadata,
      }));

      const { error } = await supabaseAdmin.from('document_chunks').insert(chunkRecords);

      if (error) {
        logger.error('Failed to store chunks:', error);
        throw error;
      }

      logger.info(`Ingested document ${fileName}: ${chunks.length} chunks`);
    } catch (error) {
      await supabaseAdmin
        .from('uploaded_documents')
        .update({ status: 'error' })
        .eq('id', documentId);
      throw error;
    }
  }

  // Search knowledge base using keyword matching
  async searchKnowledgeBase(
    userId: string,
    query: string,
    topK: number = 5
  ): Promise<DocumentChunk[]> {
    const queryKeywords = extractKeywords(query);

    // Get all chunks for this user
    const { data: chunks, error } = await supabaseAdmin
      .from('document_chunks')
      .select('content, keywords, metadata')
      .eq('user_id', userId);

    if (error || !chunks) return [];

    // Score and rank chunks
    const scored = chunks.map((chunk) => ({
      content: chunk.content,
      metadata: chunk.metadata as DocumentChunk['metadata'],
      score: computeSimilarity(queryKeywords, chunk.keywords || []),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored
      .filter((s) => s.score > 0)
      .slice(0, topK)
      .map(({ content, metadata }) => ({ content, metadata }));
  }

  // RAG-powered Q&A
  async answerWithContext(
    userId: string,
    question: string,
    chatHistory: AIMessage[] = []
  ): Promise<string> {
    // Search knowledge base
    const relevantChunks = await this.searchKnowledgeBase(userId, question);

    let context = '';
    if (relevantChunks.length > 0) {
      context = relevantChunks
        .map((c, i) => `[Document: ${c.metadata.source}, Chunk ${i + 1}]\n${c.content}`)
        .join('\n\n---\n\n');
    } else {
      context = 'No relevant documents found in the knowledge base.';
    }

    const systemPrompt = `You are AURA AI with access to the user's knowledge base.
Answer the user's question using the provided context from their uploaded documents.
If the context contains relevant information, cite the document source.
If the context doesn't contain enough information, say so and provide your best general knowledge answer.

Context from user's documents:
${context}`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      { role: 'user', content: question },
    ];

    const response = await aiService.chat(messages);
    return response.content;
  }
}

export const ragService = new RAGService();
