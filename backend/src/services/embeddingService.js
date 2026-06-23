import { ChromaClient } from 'chromadb';
import { pipeline } from '@xenova/transformers';
import Commit from '../models/Commit.js';

const chroma = new ChromaClient({ path: 'http://localhost:8001' });

let embedder = null;

const getEmbedder = async () => {
  if (!embedder) {
    console.log('Loading embedding model (first time takes ~1 min)...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('Embedding model loaded');
  }
  return embedder;
};

const generateEmbedding = async (text) => {
  const embedder = await getEmbedder();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
};

export const embedCommits = async (repoId) => {
  const commits = await Commit.find({ repoId });

  if (commits.length === 0) {
    console.log('No commits found');
    return;
  }

  const collection = await chroma.getOrCreateCollection({
    name: `repo_${repoId.toString()}`,
    embeddingFunction: null,
  });

  console.log(`Embedding ${commits.length} commits...`);

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const text = `Commit message: ${commit.message}\nFiles changed: ${commit.filesChanged.join(', ')}`;
    const embedding = await generateEmbedding(text);

    await collection.add({
      ids: [commit._id.toString()],
      embeddings: [embedding],
      documents: [text],
      metadatas: [{
        hash: commit.hash,
        message: commit.message,
        author: commit.author,
        date: commit.date.toISOString(),
        filesChanged: commit.filesChanged.join(', '),
      }],
    });

    if (i % 20 === 0) console.log(`Embedded ${i}/${commits.length}`);
  }

  console.log('All commits embedded successfully');
};

export { generateEmbedding };
