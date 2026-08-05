import express from 'express';
import { createEvent, deleteEvent, getEvents, getPublicEvents, updateEvent } from '../controllers/eventController';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/public', getPublicEvents);
router.post('/', authMiddleware, createEvent);
router.get('/', authMiddleware, getEvents);
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);

export default router;