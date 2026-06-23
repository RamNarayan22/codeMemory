import Repo from '../models/Repo.js';
import Commit from '../models/Commit.js';
import { cloneAndExtractCommits } from '../services/gitService.js';
import { embedCommits } from '../services/embeddingService.js';

export const ingestRepo = async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Repo URL is required' });

  try {
    const repoName = url.split('/').pop().replace('.git', '');
    const repo = await Repo.create({ url, name: repoName, status: 'ingesting' });

    res.status(202).json({ message: 'Ingestion started', repoId: repo._id });

    try {
      // Step 1: clone and extract commits
      const commits = await cloneAndExtractCommits(url, 200);
      const commitDocs = commits.map(c => ({ ...c, repoId: repo._id }));
      await Commit.insertMany(commitDocs);
      console.log(`Ingested ${commitDocs.length} commits`);

      // Step 2: embed commits into Chroma
      repo.status = 'embedding';
      await repo.save();
      await embedCommits(repo._id);

      // Step 3: mark as ready
      repo.status = 'ready';
      repo.commitCount = commitDocs.length;
      await repo.save();

      console.log(`Repo ${repoName} fully ready`);
    } catch (err) {
      console.error('Pipeline failed:', err.message);
      repo.status = 'error';
      await repo.save();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRepos = async (req, res) => {
  const repos = await Repo.find().sort({ createdAt: -1 });
  res.json(repos);
};

export const getRepoStatus = async (req, res) => {
  const repo = await Repo.findById(req.params.id);
  if (!repo) return res.status(404).json({ error: 'Repo not found' });
  res.json(repo);
};