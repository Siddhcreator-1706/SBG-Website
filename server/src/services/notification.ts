import { db } from '../db';

export type NotificationType = 'booking_pending' | 'booking_approved' | 'booking_rejected' | 'booking_deleted' | 'event_approved' | 'event_rejected' | 'general';

export interface CreateNotificationParams {
    type: NotificationType;
    title: string;
    message: string;
    userId?: string | null;
    metadata?: Record<string, any>;
}

/**
 * Create a notification record in the database.
 * These are shown in the admin notifications panel.
 */
export async function createNotification(params: CreateNotificationParams) {
    const { type, title, message, userId, metadata } = params;

    try {
        await db.query(
            `INSERT INTO notifications (type, title, message, user_id, metadata, is_read) 
             VALUES ($1, $2, $3, $4, $5, false)`,
            [
                type, 
                title, 
                message, 
                userId || null, 
                metadata || {}
            ]
        );
    } catch (error: any) {
        console.error('Failed to create notification:', error.message);
    }
}


/**
 * Create notifications for pending booking approvals.
 * Called alongside the email notification.
 */
export async function createBookingPendingNotifications(
    items: { venueName: string; eventName: string; startTime: string; endTime: string; clubName?: string }[]
) {
    if (items.length === 0) return;

    try {
        // Group items by eventName and clubName
        const grouped = items.reduce((acc, item) => {
            const key = `${item.eventName}::${item.clubName || 'Unknown'}`;
            if (!acc[key]) {
                acc[key] = {
                    eventName: item.eventName,
                    clubName: item.clubName || 'Unknown',
                    venues: new Set<string>(),
                    count: 0
                };
            }
            acc[key].venues.add(item.venueName);
            acc[key].count++;
            return acc;
        }, {} as Record<string, { eventName: string; clubName: string; venues: Set<string>; count: number }>);

        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        // Dynamically build the placeholders and flat values array for bulk insert
        for (const key of Object.keys(grouped)) {
            const group = grouped[key];
            const venueArray = Array.from(group.venues);
            let venueStr = venueArray.join(', ');
            if (venueArray.length > 2) {
                venueStr = `${venueArray[0]}, ${venueArray[1]}, and ${venueArray.length - 2} more`;
            }

            placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, false)`);
            values.push(
                'booking_pending', // type
                'New Booking Request', // title
                `"${group.eventName}" by ${group.clubName} pending approval for ${group.count} bookings (Venues: ${venueStr})`, // message
                null, // user_id
                { event: group.eventName, club: group.clubName, bookingsCount: group.count } // metadata
            );
        }

        const queryStr = `
            INSERT INTO notifications (type, title, message, user_id, metadata, is_read)
            VALUES ${placeholders.join(', ')}
        `;

        await db.query(queryStr, values);
    } catch (error: any) {
        console.error('Failed to create booking pending notifications:', error.message);
    }
}

/**
 * Create a single consolidated notification when bookings are bulk approved/rejected.
 */
export async function createBulkBookingStatusNotifications(
    bookings: { id: string; event_name: string; club_id: string; user_id?: string | null; venue_name?: string }[],
    status: 'approved' | 'rejected' | 'pending'
) {
    if (bookings.length === 0) return;

    try {
        const grouped = bookings.reduce((acc, b) => {
            const key = `${b.event_name || 'Event'}::${b.club_id}`;
            if (!acc[key]) {
                acc[key] = {
                    eventName: b.event_name || 'Event',
                    clubId: b.club_id,
                    userId: b.user_id,
                    venues: new Set<string>(),
                    count: 0
                };
            }
            if (b.venue_name) acc[key].venues.add(b.venue_name);
            acc[key].count++;
            return acc;
        }, {} as Record<string, { eventName: string; clubId: string; userId?: string | null; venues: Set<string>; count: number }>);

        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        for (const key of Object.keys(grouped)) {
            const group = grouped[key];
            const venueArray = Array.from(group.venues);
            let venueStr = venueArray.join(', ');
            if (venueArray.length > 2) {
                venueStr = `${venueArray[0]}, ${venueArray[1]}, and ${venueArray.length - 2} more`;
            }

            placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, false)`);
            values.push(
                status === 'approved' ? 'booking_approved' : status === 'rejected' ? 'booking_rejected' : 'booking_pending',
                `Bookings ${status.charAt(0).toUpperCase() + status.slice(1)}`,
                `${group.count} bookings for "${group.eventName}" have been ${status === 'pending' ? 'moved to pending' : status} (Venues: ${venueStr}).`,
                group.userId || null,
                { eventName: group.eventName, status, clubId: group.clubId, count: group.count }
            );
        }

        const queryStr = `
            INSERT INTO notifications (type, title, message, user_id, metadata, is_read)
            VALUES ${placeholders.join(', ')}
        `;

        await db.query(queryStr, values);
    } catch (error: any) {
        console.error('Failed to create bulk booking status notifications:', error.message);
    }
}

/**
 * Create a single consolidated notification when events are bulk approved/rejected.
 */
export async function createBulkEventStatusNotifications(
    events: { id: string; name: string; club_id: string; club_name?: string }[],
    status: 'active' | 'rejected' | 'pending'
) {
    if (events.length === 0) return;

    try {
        const grouped = events.reduce((acc, e) => {
            if (!acc[e.club_id]) {
                acc[e.club_id] = {
                    clubId: e.club_id,
                    clubName: e.club_name || 'Unknown',
                    count: 0
                };
            }
            acc[e.club_id].count++;
            return acc;
        }, {} as Record<string, { clubId: string; clubName: string; count: number }>);

        const values: any[] = [];
        const placeholders: string[] = [];
        let paramIndex = 1;

        for (const key of Object.keys(grouped)) {
            const group = grouped[key];
            placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, false)`);
            
            let message = `${group.count} events have been ${status === 'active' ? 'approved' : status === 'rejected' ? 'rejected' : 'moved to pending'}.`;
            if (group.count === 1) {
                const ev = events.find(e => e.club_id === group.clubId);
                message = `"${ev?.name || 'Event'}" has been ${status === 'active' ? 'approved' : status === 'rejected' ? 'rejected' : 'moved to pending'}.`;
            }
            
            values.push(
                status === 'active' ? 'event_approved' : status === 'rejected' ? 'event_rejected' : 'event_pending',
                `Event ${status === 'active' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending'}`,
                message,
                null, // user_id is null for broadcasting to club
                { status, clubId: group.clubId, count: group.count }
            );
        }

        const queryStr = `
            INSERT INTO notifications (type, title, message, user_id, metadata, is_read)
            VALUES ${placeholders.join(', ')}
        `;

        await db.query(queryStr, values);
    } catch (error: any) {
        console.error('Failed to create bulk event status notifications:', error.message);
    }
}