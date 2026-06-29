import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';
import os from 'os';

export const cloneAndExtractCommits = async (repoUrl, limit = 200) => {
  const tempDir = path.join(os.tmpdir(), `codememory-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const git = simpleGit();

  console.log(`Cloning ${repoUrl} into ${tempDir}...`);

  try {
    await git.clone(repoUrl, tempDir, ['--depth', '500']);
  } catch (err) {
    // Edge case 7: clean up temp folder even if clone fails
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to clone repository. Check that the URL is correct and the repo is public. (${err.message})`);
  }

  const repoGit = simpleGit(tempDir);
  const commits = [];

  try {
    const rawLog = await repoGit.raw([
      'log',
      `-n`,
      `${limit}`,
      '--name-only',
      '--pretty=format:===COMMIT===:%H%n===AUTHOR===:%an%n===DATE===:%ad%n===MSG===:%s'
    ]);

    const lines = rawLog.split('\n');
    let currentCommit = null;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      if (line.startsWith('===COMMIT===:')) {
        if (currentCommit) {
          commits.push(currentCommit);
        }
        currentCommit = {
          hash: line.substring(13),
          message: '',
          author: '',
          date: null,
          filesChanged: []
        };
      } else if (currentCommit) {
        if (line.startsWith('===AUTHOR===:')) {
          currentCommit.author = line.substring(13);
        } else if (line.startsWith('===DATE===:')) {
          currentCommit.date = new Date(line.substring(11));
        } else if (line.startsWith('===MSG===:')) {
          currentCommit.message = line.substring(10);
        } else {
          currentCommit.filesChanged.push(line);
        }
      }
    }
    if (currentCommit) {
      commits.push(currentCommit);
    }
  } catch (err) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`Failed to extract commits. (${err.message})`);
  }

  // Always clean up temp folder after successful extraction
  fs.rmSync(tempDir, { recursive: true, force: true });

  return commits;
};