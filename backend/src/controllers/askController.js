import { askQuestion } from '../services/ragService.js';

export const ask = async (req, res) => {
  const { repoId, question } = req.body;

  if (!repoId || !question) {
    return res.status(400).json({ error: 'repoId and question are required' });
  }

  try {
    const result = await askQuestion(repoId, question);
    res.json(result);
  } catch (err) {
    console.error('Ask failed:', err.message);
    res.status(500).json({ error: err.message });
  }
};
