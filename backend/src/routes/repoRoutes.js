import express from 'express';
import { ingestRepo, getRepos, getRepoStatus } from '../controllers/repoControllers.js';

const router = express.Router();

router.post('/', ingestRepo);
router.get('/', getRepos);
router.get('/:id', getRepoStatus);

export default router;