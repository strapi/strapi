/**
 * Address parsing and grouping — aligned with the legacy `sendmail` npm package
 * (guileen/node-sendmail) behavior for recipient grouping and domain extraction.
 */

/** Max length for an SMTP domain part / DNS name. */
const MAX_DOMAIN_LENGTH = 253;

/** RFC 5321 practical upper bound; cheap pre-check before any parsing. */
const MAX_EMAIL_LOCAL_PART_PLUS_DOMAIN = 320;

/** Extract bare email from `Name <email@domain>` or return trimmed input (linear time, no regex). */
export function extractEmail(address: string): string {
  const trimmed = address.trim();
  const open = trimmed.indexOf('<');
  if (open === -1) {
    return trimmed;
  }
  const close = trimmed.indexOf('>', open + 1);
  if (close === -1) {
    return trimmed;
  }
  return trimmed.slice(open + 1, close).trim();
}

/** Split comma-separated address lists (legacy package used string + comma split). */
export function parseAddressList(addresses: string | undefined): string[] {
  if (!addresses) {
    return [];
  }
  return addresses
    .split(',')
    .map((a) => extractEmail(a))
    .filter((a) => a.length > 0);
}

/**
 * Legacy `sendmail` used `[\w\d\-.]+` for the domain. We only run this on strings already
 * capped to `MAX_DOMAIN_LENGTH`, so the match is linear in a bounded input (no ReDoS).
 */
const LEGACY_DOMAIN_CHAR_PATTERN = /^[a-zA-Z0-9_.-]+$/;

/** Domain part of an email address (after the last `@`). */
export function getHostFromAddress(email: string): string {
  const normalized = extractEmail(email);
  if (normalized.length > MAX_EMAIL_LOCAL_PART_PLUS_DOMAIN) {
    return 'localhost';
  }
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) {
    return 'localhost';
  }
  const domain = normalized.slice(at + 1);
  if (domain.length > MAX_DOMAIN_LENGTH || !LEGACY_DOMAIN_CHAR_PATTERN.test(domain)) {
    return 'localhost';
  }
  return domain;
}

/** Group recipient addresses by recipient domain (MX routing key). */
export function groupRecipientsByDomain(recipients: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const raw of recipients) {
    const host = getHostFromAddress(raw);
    if (!groups[host]) {
      groups[host] = [];
    }
    groups[host].push(raw);
  }
  return groups;
}

/** Collect all recipients from to / cc / bcc (same sources as legacy sendmail). */
export function collectRecipients(mail: { to?: string; cc?: string; bcc?: string }): string[] {
  return [
    ...parseAddressList(mail.to),
    ...parseAddressList(mail.cc),
    ...parseAddressList(mail.bcc),
  ];
}
