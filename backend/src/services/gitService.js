import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const cloneAndExtractCommits = async (repoUrl, limit = 200) => {
  const tempDir = path.join(os.tmpdir(), `codememory-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const git = simpleGit();

  console.log(`Cloning ${repoUrl} into ${tempDir}...`);
  await git.clone(repoUrl, tempDir, ['--depth', '500']);

  const repoGit = simpleGit(tempDir);
  const log = await repoGit.log({ maxCount: limit });

  const commits = [];

  for (const entry of log.all) {
    let filesChanged = [];
    try {
      const diffSummary = await repoGit.show([entry.hash, '--stat', '--format=']);
      filesChanged = diffSummary
        .split('\n')
        .map(line => line.split('|')[0].trim())
        .filter(line => line.length > 0 && !line.includes('changed'));
    } catch (err) {
      // first commit has no parent to diff against
    }

    commits.push({
      hash: entry.hash,
      message: entry.message,
      author: entry.author_name,
      date: new Date(entry.date),
      filesChanged,
    });
  }

  fs.rmSync(tempDir, { recursive: true, force: true });

  return commits;
};