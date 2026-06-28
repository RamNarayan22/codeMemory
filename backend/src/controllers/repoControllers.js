import Repo from '../models/repo.js';
import Commit from '../models/commit.js';
import { cloneAndExtractCommits } from '../services/gitService.js';
import { embedCommits } from '../services/embeddingService.js';
import mongoose from 'mongoose';

// Simple URL format check — must start with http/https and contain a path
const isValidGitUrl = (url) => {
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      parsed.pathname.length > 1; // must have at least /repo
  } catch {
    return false;
  }
};

export const ingestRepo = async (req, res) => {
  const { url } = req.body;

  // Edge case 1: Missing URL
  if (!url) return res.status(400).json({ error: 'Repo URL is required' });

  // Edge case 1b: Invalid URL format
  if (!isValidGitUrl(url)) {
    return res.status(400).json({ error: 'Invalid repository URL. Please provide a valid http/https Git URL.' });
  }

  try {
    const repoName = url.split('/').pop().replace('.git', '');
    const repo = await Repo.create({ url, name: repoName, status: 'ingesting' });

    res.status(202).json({ message: 'Ingestion started', repoId: repo._id });

    try {
      // Step 1: clone and extract commits
      const commits = await cloneAndExtractCommits(url, 200);

      // Edge case: repo exists but has no commits (e.g. empty repo)
      if (commits.length === 0) {
        repo.status = 'error';
        repo.errorMessage = 'Repository has no commits to ingest.';
        await repo.save();
        return;
      }

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
      repo.errorMessage = err.message;
      await repo.save();
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRepos = async (req, res) => {
  try {
    const repos = await Repo.find().sort({ createdAt: -1 });
    res.json(repos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getRepoStatus = async (req, res) => {
  // Edge case 2: malformed MongoDB ID crashes Mongoose with CastError
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid repository ID format.' });
  }

  try {
    const repo = await Repo.findById(req.params.id);
    if (!repo) return res.status(404).json({ error: 'Repo not found' });
    res.json(repo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};