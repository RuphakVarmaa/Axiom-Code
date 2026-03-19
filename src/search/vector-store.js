/**
 * Axiom — Vector Store (Lightweight)
 * Stores embeddings and performing cosine similarity search
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AXIOM_DIR } from '../config/config.js';

const INDICES_DIR = path.join(AXIOM_DIR, 'indices');

export class VectorStore {
  constructor(workspacePath) {
    this.workspacePath = workspacePath;
    this.indexId = crypto.createHash('md5').update(workspacePath).digest('hex');
    this.indexPath = path.join(INDICES_DIR, `${this.indexId}.json`);
    this.index = { documents: [] };
    
    if (!fs.existsSync(INDICES_DIR)) {
      fs.mkdirSync(INDICES_DIR, { recursive: true });
    }
    this.load();
  }

  load() {
    if (fs.existsSync(this.indexPath)) {
      try {
        this.index = JSON.parse(fs.readFileSync(this.indexPath, 'utf-8'));
      } catch {
        this.index = { documents: [] };
      }
    }
  }

  save() {
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2), 'utf-8');
  }

  addDocument(id, text, metadata, embedding) {
    this.index.documents.push({ id, text, metadata, embedding });
  }

  search(embedding, limit = 5) {
    const scores = this.index.documents.map(doc => ({
      ...doc,
      score: this._cosineSimilarity(embedding, doc.embedding),
    }));

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ id, text, metadata, score }) => ({ id, text, metadata, score }));
  }

  _cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  clear() {
    this.index.documents = [];
    this.save();
  }
}
