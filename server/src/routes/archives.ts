import express from 'express';
import {
  deleteArchivedBooking,
  deleteArchivedEvent,
  emptyArchives,
  getArchivedBookings,
  getArchivedEvents,
  getArchivedMembers,
  deleteArchivedMember
} from '../controllers/archiveController';
import authMiddleware from '../middleware/auth';

const router = express.Router();

router.get('/events', authMiddleware, getArchivedEvents);
router.get('/bookings', authMiddleware, getArchivedBookings);
router.delete('/events/all', authMiddleware, emptyArchives);
router.delete('/all', authMiddleware, emptyArchives);
router.delete('/events/:id', authMiddleware, deleteArchivedEvent);
router.delete('/bookings/:id', authMiddleware, deleteArchivedBooking);
router.get('/members', authMiddleware, getArchivedMembers);
router.delete('/members/:id', authMiddleware, deleteArchivedMember);

export default router;
