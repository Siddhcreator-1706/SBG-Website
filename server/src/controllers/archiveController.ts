import { Request, Response } from 'express';
import { db } from '../db';
import { getClubForUser } from '../utils/clubAuth';

export const getArchivedEvents = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    let query = 'SELECT * FROM archived_events';
    let params: any[] = [];

    if (!isAdmin) {
      const club = await getClubForUser(req);
      if (!club) {
        return res.status(404).json({ error: 'Club not found for this account' });
      }
      query += ' WHERE club_id = $1';
      params.push(club.id);
    }

    query += ' ORDER BY archived_at DESC';

    const eventsRes = await db.query(query, params);
    const events = eventsRes.rows;

    if (events.length === 0) {
      return res.json([]);
    }

    const eventIds = events.map(e => e.id);
    const idList = eventIds.map((_, i) => `$${i + 1}`).join(',');

    const bookingsRes = await db.query(`
      SELECT ab.*, v.name as venue_name
      FROM archived_bookings ab
      LEFT JOIN venues v ON ab.venue_id = v.id
      WHERE ab.event_id IN (${idList})
    `, eventIds);
    const reportsRes = await db.query(`SELECT * FROM archived_event_reports WHERE event_id IN (${idList})`, eventIds);

    const result = events.map(event => ({
      ...event,
      bookings: bookingsRes.rows.filter(b => b.event_id === event.id),
      report: reportsRes.rows.find(r => r.event_id === event.id) || null
    }));

    return res.json(result);
  } catch (error: any) {
    console.error('Error fetching archived events:', error);
    return res.status(500).json({ error: 'Failed to fetch archived events' });
  }
};

export const deleteArchivedEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user?.role;
    const isAdmin = userRole === 'admin' || userRole === 'super_admin';

    // Verify ownership if not admin
    if (!isAdmin) {
      const club = await getClubForUser(req);
      if (!club) {
        return res.status(404).json({ error: 'Club not found for this account' });
      }
      
      const checkRes = await db.query('SELECT club_id FROM archived_events WHERE id = $1', [id]);
      if (checkRes.rows.length === 0) {
        return res.status(404).json({ error: 'Archive not found' });
      }
      
      if (checkRes.rows[0].club_id !== club.id) {
        return res.status(403).json({ error: 'Not authorized to delete this archive' });
      }
    }

    // ON DELETE CASCADE should handle the related archived_bookings and archived_event_reports if configured, 
    // otherwise we might need to explicitly delete them. Let's explicitly delete just in case.
    await db.query('DELETE FROM archived_event_reports WHERE event_id = $1', [id]);
    await db.query('DELETE FROM archived_bookings WHERE event_id = $1', [id]);
    const deleteRes = await db.query('DELETE FROM archived_events WHERE id = $1 RETURNING id', [id]);

    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Archive not found' });
    }

    return res.json({ message: 'Archive deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting archived event:', error);
    return res.status(500).json({ error: 'Failed to delete archived event' });
  }
};
