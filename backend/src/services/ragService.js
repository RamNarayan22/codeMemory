import Groq from 'groq-sdk';
import { ChromaClient } from 'chromadb';
import { generateEmbedding } from './embeddingService.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const chroma = new ChromaClient({ path: 'http://localhost:8001' });

export const askQuestion = async (repoId, question) => {
  const questionEmbedding = await generateEmbedding(question);

  // Edge case 3: collection may not exist if embedding step failed
  let collection;
  try {
    collection = await chroma.getCollection({
      name: `repo_${repoId.toString()}`,
      embeddingFunction: null,
    });
  } catch (err) {
    throw new Error(
      'This repository has not been indexed yet, or indexing failed. Please re-ingest the repository.'
    );
  }

  // Edge case 4: nResults cannot exceed the total number of stored commits
  const countResult = await collection.count();
  const nResults = Math.min(5, countResult);

  if (nResults === 0) {
    throw new Error('No commits are indexed for this repository. Please re-ingest.');
  }

  const results = await collection.query({
    queryEmbeddings: [questionEmbedding],
    nResults,
  });

  const relevantCommits = results.metadatas[0];

  // Build context string from the matching commits
  const context = relevantCommits
    .map((commit, i) => `Commit ${i + 1}: ${commit.message} | Files: ${commit.filesChanged}`)
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
      filesChanged: c.filesChanged,
    })),
  };
};
