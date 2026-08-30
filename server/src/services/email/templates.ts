export const BRAND_COLOR = '#1a3d7c';
export const BRAND_COLOR_DARK = '#12294f';
export const TEXT_COLOR = '#2d2d2d';
export const MUTED_COLOR = '#6b7280';
export const BORDER_COLOR = '#e5e7eb';
export const BG_COLOR = '#f4f5f7';
export const SUCCESS_COLOR = '#15803d';
export const SUCCESS_BG = '#f0fdf4';
export const DANGER_COLOR = '#b91c1c';
export const DANGER_BG = '#fef2f2';

export type EmailLayoutOptions = {
  preheader?: string;
  heading: string;
  bodyHtml: string;
  footerNote?: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wraps templated content in a consistent, formal email shell:
 * header band with brand name, white content card, and a muted footer.
 */
export function renderEmailLayout({ preheader, heading, bodyHtml, footerNote }: EmailLayoutOptions): string {
  const safeHeading = escapeHtml(heading);
  const safePreheader = preheader ? escapeHtml(preheader) : '';
  const safeFooter = escapeHtml(footerNote || 'This is an automated message, please do not reply directly to this email.');
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeHeading}</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BG_COLOR}; font-family: 'Segoe UI', Arial, Helvetica, sans-serif;">
    ${safePreheader ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0;">${safePreheader}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR}; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:100%; background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">

            <!-- Header -->
            <tr>
              <td style="background-color:${BRAND_COLOR}; padding: 24px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#ffffff; font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">
                      SBG Team
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Heading -->
            <tr>
              <td style="padding: 32px 32px 8px 32px;">
                <h1 style="margin:0; font-size: 20px; line-height: 28px; color:${TEXT_COLOR}; font-weight: 600;">
                  ${safeHeading}
                </h1>
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 8px 32px 32px 32px; font-size: 15px; line-height: 24px; color:${TEXT_COLOR};">
                ${bodyHtml}
              </td>
            </tr>

            <!-- Divider -->
            <tr>
              <td style="padding: 0 32px;">
                <div style="border-top: 1px solid ${BORDER_COLOR};"></div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 20px 32px 28px 32px;">
                <p style="margin:0 0 6px 0; font-size: 13px; line-height: 20px; color:${MUTED_COLOR};">
                  ${safeFooter}
                </p>
                <p style="margin:0; font-size: 13px; line-height: 20px; color:${MUTED_COLOR};">
                  &mdash; SBG Team
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Renders a labeled key/value row inside a details card. */
export function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color:${MUTED_COLOR}; width: 140px; vertical-align: top;">${escapeHtml(label)}</td>
      <td style="padding: 6px 0; font-size: 14px; color:${TEXT_COLOR}; font-weight: 600; vertical-align: top;">${escapeHtml(value)}</td>
    </tr>`;
}

/** Wraps a set of detail rows in a bordered card. */
export function detailsCard(rowsHtml: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_COLOR}; border: 1px solid ${BORDER_COLOR}; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
      ${rowsHtml}
    </table>`;
}

/** Renders a pill-style status badge. */
export function statusBadge(text: string, tone: 'success' | 'danger'): string {
  const color = tone === 'success' ? SUCCESS_COLOR : DANGER_COLOR;
  const bg = tone === 'success' ? SUCCESS_BG : DANGER_BG;
  return `<span style="display:inline-block; padding: 3px 10px; border-radius: 999px; background-color:${bg}; color:${color}; font-size: 12px; font-weight: 600;">${text}</span>`;
}
