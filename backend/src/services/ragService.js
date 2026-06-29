import Groq from 'groq-sdk';
import { generateEmbedding } from './embeddingService.js';
import Commit from '../models/commit.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const dotProduct = (a, b) => {
  let sum = 0;
  const len = a.length;
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
};

export const askQuestion = async (repoId, question) => {
  const questionEmbedding = await generateEmbedding(question);

  // Fetch all commits for this repository that have embeddings
  const commits = await Commit.find({ repoId, embedding: { $exists: true, $ne: [] } });

  if (commits.length === 0) {
    throw new Error(
      'This repository has not been indexed yet, or indexing failed. Please re-ingest the repository.'
    );
  }

  // Calculate similarity scores for all commits
  const scoredCommits = commits.map(commit => {
    const score = dotProduct(questionEmbedding, commit.embedding);
    return { commit, score };
  });

  // Sort by score descending and take top 5
  scoredCommits.sort((a, b) => b.score - a.score);
  const relevantCommits = scoredCommits.slice(0, 5).map(sc => sc.commit);

  // Build context string from the matching commits
  const context = relevantCommits
    .map((commit, i) => `Commit ${i + 1}: ${commit.message} | Files: ${commit.filesChanged.join(', ')}`)
    .join('\n');

  const prompt = `You are a helpful assistant answering questions about a codebase based on git commit history.\n\nRelevant commits:\n${context}\n\nQuestion: "${question}"\n\nAnswer specifically and cite commit messages. If the commits are not relevant to the question, say so clearly instead of guessing.`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  const answer = response.choices[0].message.content;

  return {
    answer,
    sourceCommits: relevantCommits.map(c => ({
      hash: c.hash,
      message: c.message,
      author: c.author,
      date: c.date,
      filesChanged: Array.isArray(c.filesChanged) ? c.filesChanged : (c.filesChanged ? [c.filesChanged] : []),
    })),
  };
};
