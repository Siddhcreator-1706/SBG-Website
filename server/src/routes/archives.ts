import express from 'express';
import authMiddleware from '../middleware/auth';
import { getArchivedEvents, deleteArchivedEvent } from '../controllers/archiveController';

const router = express.Router();

router.get('/events', authMiddleware, getArchivedEvents);
router.delete('/events/:id', authMiddleware, deleteArchivedEvent);

export default router;
