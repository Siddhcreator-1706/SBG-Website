import nodemailer from 'nodemailer';

const PASSWORD_SMTP_HOST = process.env.PASSWORD_SMTP_HOST;
const PASSWORD_SMTP_PORT = process.env.PASSWORD_SMTP_PORT;
const PASSWORD_SMTP_USER = process.env.PASSWORD_SMTP_USER;
const PASSWORD_SMTP_PASS = process.env.PASSWORD_SMTP_PASS;
const PASSWORD_MAIL = process.env.PASSWORD_MAIL;

const APPROVAL_SMTP_HOST = process.env.APPROVAL_SMTP_HOST;
const APPROVAL_SMTP_PORT = process.env.APPROVAL_SMTP_PORT;
const APPROVAL_SMTP_USER = process.env.APPROVAL_SMTP_USER;
const APPROVAL_SMTP_PASS = process.env.APPROVAL_SMTP_PASS;
const APPROVAL_MAIL = process.env.APPROVAL_MAIL;

const REMINDER_SMTP_HOST = process.env.REMINDER_SMTP_HOST;
const REMINDER_SMTP_PORT = process.env.REMINDER_SMTP_PORT;
const REMINDER_SMTP_USER = process.env.REMINDER_SMTP_USER;
const REMINDER_SMTP_PASS = process.env.REMINDER_SMTP_PASS;
const EVENT_REMINDER_MAIL = process.env.EVENT_REMINDER_MAIL;

export type PendingBookingItem = {
  venueName: string;
  eventName: string;
  startTime: string;
  endTime: string;
  clubName?: string;
  eventType?: string;
};

function formatEventTypeLabel(eventType?: string): string {
  if (!eventType) return 'General';
  return eventType
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatDateLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatTimeLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function isPasswordConfigured(): boolean {
  return !!(
    PASSWORD_SMTP_HOST &&
    PASSWORD_SMTP_USER &&
    PASSWORD_SMTP_PASS &&
    PASSWORD_MAIL
  );
}

function isApprovalConfigured(): boolean {
  return !!(
    APPROVAL_SMTP_HOST &&
    APPROVAL_SMTP_USER &&
    APPROVAL_SMTP_PASS &&
    APPROVAL_MAIL
  );
}

function isReminderConfigured(): boolean {
  return !!(
    REMINDER_SMTP_HOST &&
    REMINDER_SMTP_USER &&
    REMINDER_SMTP_PASS &&
    EVENT_REMINDER_MAIL
  );
}

const passwordTransporter = nodemailer.createTransport({
  host: PASSWORD_SMTP_HOST,
  port: parseInt(PASSWORD_SMTP_PORT || '587'),
  secure: parseInt(PASSWORD_SMTP_PORT || '587') === 465,
  auth: {
    user: PASSWORD_SMTP_USER,
    pass: PASSWORD_SMTP_PASS,
  },
});

const approvalTransporter = nodemailer.createTransport({
  host: APPROVAL_SMTP_HOST,
  port: parseInt(APPROVAL_SMTP_PORT || '587'),
  secure: parseInt(APPROVAL_SMTP_PORT || '587') === 465,
  auth: {
    user: APPROVAL_SMTP_USER,
    pass: APPROVAL_SMTP_PASS,
  },
});

const reminderTransporter = nodemailer.createTransport({
  host: REMINDER_SMTP_HOST,
  port: parseInt(REMINDER_SMTP_PORT || '587'),
  secure: parseInt(REMINDER_SMTP_PORT || '587') === 465,
  auth: {
    user: REMINDER_SMTP_USER,
    pass: REMINDER_SMTP_PASS,
  },
});


/**
 * Send an email to the user with a temporary password when they trigger a forgot password request.
 */
export async function sendPasswordResetEmail(
  email: string,
  tempPassword: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isPasswordConfigured()) {
    console.warn('SMTP not configured; skipping password reset email.');
    return { sent: false };
  }

  const subject = 'Password Reset - SBG Team';
  const messageHtml = `
    <p>Dear User,</p>
    <p>We received a request to reset your password. Your 6-digit verification code is:</p>
    <h3 style="background:#f4f4f4; padding:10px; display:inline-block; font-family:monospace; border-radius:4px; margin: 10px 0; letter-spacing: 4px;">${tempPassword}</h3>
    <p><strong>This code will expire in 5 minutes.</strong> Please use this code to verify your identity and reset your password.</p>
    <p>Regards,<br/>SBG Team</p>
  `;

  try {
    await passwordTransporter.sendMail({
      from: PASSWORD_MAIL,
      to: email,
      subject: subject,
      html: messageHtml,
    });
    return { sent: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : JSON.stringify(err, null, 2);
    console.error('Failed to send password reset email:', errorMsg);
    return { sent: false, error: errorMsg };
  }
}

/**
 * Send an email to the club when their booking is approved.
 */
export async function sendBookingApprovedEmailToClub(
  clubEmail: string,
  venueName: string,
  eventName: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isApprovalConfigured()) return { sent: false };

  const subject = 'Booking Approved - SBG Team';
  const messageHtml = `<p>Your booking for <strong>${eventName}</strong> at <strong>${venueName}</strong> on <strong>${date}</strong> from <strong>${startTime}</strong> to <strong>${endTime}</strong> has been approved.</p>`;

  try {
    await approvalTransporter.sendMail({
      from: APPROVAL_MAIL,
      to: clubEmail,
      subject: subject,
      html: messageHtml,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

export async function sendBookingCancelledEmailToClub(
  clubEmail: string,
  venueName: string,
  eventName: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isApprovalConfigured()) return { sent: false };

  const subject = 'Booking Cancelled - SBG Team';
  const messageHtml = `<p>Your approved booking for <strong>${eventName}</strong> at <strong>${venueName}</strong> on <strong>${date}</strong> from <strong>${startTime}</strong> to <strong>${endTime}</strong> has been cancelled by the admin.</p>`;

  try {
    await approvalTransporter.sendMail({
      from: APPROVAL_MAIL,
      to: clubEmail,
      subject: subject,
      html: messageHtml,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

/**
 * Send an event report reminder to the club.
 */
export async function sendEventReportReminderEmail(
  clubEmail: string,
  eventName: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isReminderConfigured()) return { sent: false };

  const subject = 'Event Report Reminder - SBG Team';
  const messageHtml = `<p>This is a reminder to submit the event report for your recent event: <strong>${eventName}</strong>.</p>`;

  try {
    await reminderTransporter.sendMail({
      from: EVENT_REMINDER_MAIL,
      to: clubEmail,
      subject: subject,
      html: messageHtml,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}

/**
 * Send a bulk booking processed email to the club.
 */
export async function sendBulkBookingProcessedEmail(
  clubEmail: string,
  eventName: string,
  date: string,
  startTime: string,
  endTime: string,
  approvedVenues: string[],
  rejectedVenues: string[]
): Promise<{ sent: boolean; error?: string }> {
  if (!isApprovalConfigured()) return { sent: false };

  const subject = 'Booking Processed - SBG Team';
  
  let htmlVenues = '';
  if (approvedVenues.length > 0) {
    htmlVenues += `<p><strong>Approved Venues:</strong></p><ul>`;
    approvedVenues.forEach(v => { htmlVenues += `<li style="color: green;">${v}</li>`; });
    htmlVenues += `</ul>`;
  }
  if (rejectedVenues.length > 0) {
    htmlVenues += `<p><strong>Rejected Venues:</strong></p><ul>`;
    rejectedVenues.forEach(v => { htmlVenues += `<li style="color: red;">${v}</li>`; });
    htmlVenues += `</ul>`;
  }

  const messageHtml = `
    <p>Your booking for <strong>${eventName}</strong> on <strong>${date}</strong> from <strong>${startTime}</strong> to <strong>${endTime}</strong> has been processed by the admin.</p>
    ${htmlVenues}
    <p>Please check your dashboard for more details.</p>
  `;

  try {
    await approvalTransporter.sendMail({
      from: APPROVAL_MAIL,
      to: clubEmail,
      subject: subject,
      html: messageHtml,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, error: (err as Error).message };
  }
}
