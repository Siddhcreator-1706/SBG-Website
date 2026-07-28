import nodemailer from 'nodemailer';

export const PASSWORD_SMTP_HOST = process.env.PASSWORD_SMTP_HOST;
export const PASSWORD_SMTP_PORT = process.env.PASSWORD_SMTP_PORT;
export const PASSWORD_SMTP_USER = process.env.PASSWORD_SMTP_USER;
export const PASSWORD_SMTP_PASS = process.env.PASSWORD_SMTP_PASS;
export const PASSWORD_MAIL = process.env.PASSWORD_MAIL;

export const APPROVAL_SMTP_HOST = process.env.APPROVAL_SMTP_HOST;
export const APPROVAL_SMTP_PORT = process.env.APPROVAL_SMTP_PORT;
export const APPROVAL_SMTP_USER = process.env.APPROVAL_SMTP_USER;
export const APPROVAL_SMTP_PASS = process.env.APPROVAL_SMTP_PASS;
export const APPROVAL_MAIL = process.env.APPROVAL_MAIL;

export const REMINDER_SMTP_HOST = process.env.REMINDER_SMTP_HOST;
export const REMINDER_SMTP_PORT = process.env.REMINDER_SMTP_PORT;
export const REMINDER_SMTP_USER = process.env.REMINDER_SMTP_USER;
export const REMINDER_SMTP_PASS = process.env.REMINDER_SMTP_PASS;
export const EVENT_REMINDER_MAIL = process.env.EVENT_REMINDER_MAIL;

export function isPasswordConfigured(): boolean {
  return !!(
    PASSWORD_SMTP_HOST &&
    PASSWORD_SMTP_USER &&
    PASSWORD_SMTP_PASS &&
    PASSWORD_MAIL
  );
}

export function isApprovalConfigured(): boolean {
  return !!(
    APPROVAL_SMTP_HOST &&
    APPROVAL_SMTP_USER &&
    APPROVAL_SMTP_PASS &&
    APPROVAL_MAIL
  );
}

export function isReminderConfigured(): boolean {
  return !!(
    REMINDER_SMTP_HOST &&
    REMINDER_SMTP_USER &&
    REMINDER_SMTP_PASS &&
    EVENT_REMINDER_MAIL
  );
}

export const passwordTransporter = nodemailer.createTransport({
  host: PASSWORD_SMTP_HOST,
  port: parseInt(PASSWORD_SMTP_PORT || '587'),
  secure: parseInt(PASSWORD_SMTP_PORT || '587') === 465,
  auth: {
    user: PASSWORD_SMTP_USER,
    pass: PASSWORD_SMTP_PASS,
  },
});

export const approvalTransporter = nodemailer.createTransport({
  host: APPROVAL_SMTP_HOST,
  port: parseInt(APPROVAL_SMTP_PORT || '587'),
  secure: parseInt(APPROVAL_SMTP_PORT || '587') === 465,
  auth: {
    user: APPROVAL_SMTP_USER,
    pass: APPROVAL_SMTP_PASS,
  },
});

export const reminderTransporter = nodemailer.createTransport({
  host: REMINDER_SMTP_HOST,
  port: parseInt(REMINDER_SMTP_PORT || '587'),
  secure: parseInt(REMINDER_SMTP_PORT || '587') === 465,
  auth: {
    user: REMINDER_SMTP_USER,
    pass: REMINDER_SMTP_PASS,
  },
});
