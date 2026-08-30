/** Official university domain for club/committee login accounts */
export const OFFICIAL_EMAIL_DOMAIN = '@dau.ac.in';
const OFFICIAL_HOST = 'dau.ac.in';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isOfficialCommitteeEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  const at = normalized.indexOf('@');
  if (at <= 0 || at !== normalized.lastIndexOf('@')) {
    return false;
  }
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  return local.length > 0 && domain === OFFICIAL_HOST;
}
