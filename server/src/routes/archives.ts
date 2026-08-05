import express from 'express';
import { deleteArchivedEvent, getArchivedEvents } from '../controllers/archiveController';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/events', authMiddleware, getArchivedEvents);
router.delete('/events/:id', authMiddleware, deleteArchivedEvent);

export default router;
