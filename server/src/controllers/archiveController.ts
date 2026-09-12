import { Request, Response } from 'express';
import { db } from '../db';
import { getClubForUser } from '../utils/clubAuth';

export const getArchivedEvents = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const isAdmin = userRole === 'admin';

    let query = `
      SELECT ae.id, ae.club_id, ae.name, ae.date, ae.end_date, ae.venue, ae.event_type, ae.status, ae.report_exempt, ae.created_at, ae.updated_at, ae.archived_at, c.name as club_name
      FROM archived_events ae
      LEFT JOIN clubs c ON ae.club_id = c.id
    `;
    let params: any[] = [];

    if (!isAdmin) {
      const club = await getClubForUser(req);
      if (!club) {
        return res.status(404).json({ error: 'Club not found for this account' });
      }
      query += ' WHERE ae.club_id = $1';
      params.push(club.id);
    }

    query += ' ORDER BY ae.archived_at DESC';

    const eventsRes = await db.query(query, params);
    const events = eventsRes.rows;

    if (events.length === 0) {
      return res.json([]);
    }

    const eventIds = events.map(e => e.id);
    const idList = eventIds.map((_, i) => `$${i + 1}`).join(',');

    const bookingsRes = await db.query(`
      SELECT ab.id, ab.club_id, ab.venue_id, ab.start_time, ab.end_time, ab.status, ab.user_id,
             COALESCE(ab.booking_name, ab.event_name, 'Meeting') as booking_name,
             ab.event_name, ab.event_type, ab.expected_attendees, ab.batch_id, ab.event_id,
             ab.created_at, ab.updated_at, ab.archived_at, v.name as venue_name
      FROM archived_bookings ab
      LEFT JOIN venues v ON ab.venue_id = v.id
      WHERE ab.event_id IN (${idList})
    `, eventIds);
    const reportsRes = await db.query(`SELECT id, club_id, event_id, level, report_doc_link, participants_sheet_link, photos_drive_link, awards_doc_link, created_at, updated_at, archived_at FROM archived_event_reports WHERE event_id IN (${idList})`, eventIds);

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

export const getArchivedBookings = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const isAdmin = userRole === 'admin';

    let query = `
      SELECT ab.id, ab.club_id, ab.venue_id, ab.start_time, ab.end_time, ab.status, ab.user_id,
             COALESCE(ab.booking_name, ab.event_name, 'Meeting') as booking_name,
             ab.event_name, ab.event_type, ab.expected_attendees, ab.batch_id, ab.event_id,
             ab.created_at, ab.updated_at, ab.archived_at,
             v.name as venue_name, c.name as club_name
      FROM archived_bookings ab
      LEFT JOIN venues v ON ab.venue_id = v.id
      LEFT JOIN clubs c ON ab.club_id = c.id
      WHERE (ab.event_id IS NULL OR NOT EXISTS (SELECT 1 FROM archived_events ae WHERE ae.id = ab.event_id))
    `;
    let params: any[] = [];

    if (!isAdmin) {
      const club = await getClubForUser(req);
      if (!club) {
        return res.status(404).json({ error: 'Club not found for this account' });
      }
      query += ' AND ab.club_id = $1';
      params.push(club.id);
    }

    query += ' ORDER BY ab.archived_at DESC';

    const { rows } = await db.query(query, params);
    return res.json(rows);
  } catch (error: any) {
    console.error('Error fetching archived bookings:', error);
    return res.status(500).json({ error: 'Failed to fetch archived bookings' });
  }
};

export const getArchivedMembers = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const isAdmin = userRole === 'admin';

    let query = `
      SELECT cm.id, cm.club_id, cm.full_name, cm.roll_number, cm.email, cm.designation, cm.phone,
             cm.is_core_member, cm.tenure_start_date, cm.tenure_end_date, cm.tenure_end_reason,
             cm.created_at, cm.updated_at, c.name as club_name
      FROM club_members cm
      JOIN clubs c ON cm.club_id = c.id
      WHERE cm.is_active = false
    `;
    let params: any[] = [];

    if (!isAdmin) {
      const club = await getClubForUser(req);
      if (!club) {
        return res.status(404).json({ error: 'Club not found for this account' });
      }
      query += ' AND cm.club_id = $1';
      params.push(club.id);
    }

    query += ' ORDER BY cm.tenure_end_date DESC NULLS LAST, cm.updated_at DESC';

    const { rows } = await db.query(query, params);
    return res.json(rows);
  } catch (error: any) {
    console.error('Error fetching archived members:', error);
    return res.status(500).json({ error: 'Failed to fetch archived members' });
  }
};

export const deleteArchivedEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user?.role;
    const isAdmin = userRole === 'admin';

    // Verify ownership if not admin
    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can permanently delete archives' });
    }

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

export const deleteArchivedBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userRole = (req as any).user?.role;
    const isAdmin = userRole === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Only admins can permanently delete archives' });
    }

    const deleteRes = await db.query('DELETE FROM archived_bookings WHERE id = $1 RETURNING id', [id]);
    if (deleteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Archived booking not found' });
    }

    return res.json({ message: 'Archived booking deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting archived booking:', error);
    return res.status(500).json({ error: 'Failed to delete archived booking' });
  }
};

export const deleteArchivedMember = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only admins can permanently delete archived members' });
    }

    const { id } = req.params;

    const result = await db.query('DELETE FROM club_members WHERE id = $1 AND is_active = false RETURNING id', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Archived member not found' });
    }

    return res.json({ success: true, message: 'Archived member permanently deleted' });
  } catch (error: any) {
    console.error('Error deleting archived member:', error);
    return res.status(500).json({ error: 'Failed to delete archived member' });
  }
};

export const emptyArchives = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const isAdmin = userRole === 'admin';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Not authorized to empty archives' });
    }

    await db.query('DELETE FROM archived_event_reports');
    await db.query('DELETE FROM archived_bookings');
    await db.query('DELETE FROM archived_events');

    return res.json({ message: 'All archives deleted successfully' });
  } catch (error: any) {
    console.error('Error emptying archives:', error);
    return res.status(500).json({ error: 'Failed to empty archives' });
  }
};
