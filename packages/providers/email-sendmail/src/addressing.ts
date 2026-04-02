/**
 * Address parsing and grouping — aligned with the legacy `sendmail` npm package
 * (guileen/node-sendmail) behavior for recipient grouping and domain extraction.
 */

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

/** Split address lists (legacy package accepted both string and array). */
export function parseAddressList(addresses: string | string[] | undefined): string[] {
  if (!addresses) {
    return [];
  }
  if (Array.isArray(addresses)) {
    return addresses.map((a) => extractEmail(String(a))).filter((a) => a.length > 0);
  }
  return addresses
    .split(',')
    .map((a) => extractEmail(a))
    .filter((a) => a.length > 0);
}

/** Legacy sendmail host extraction regex from guileen/node-sendmail@1.6.1. */
const LEGACY_HOST_REGEX = /[^@]+@([\w\d\-.]+)/;

/**
 * Do not run the legacy regex on unbounded input (defense in depth; the pattern is not ReDoS-prone,
 * but capping work is cheap and matches RFC 5321 practical address size expectations).
 */
const MAX_INPUT_LEN_FOR_LEGACY_HOST_REGEX = 320;

/** Domain part of an email address (after the last `@`). */
export function getHostFromAddress(email: string): string | undefined {
  const normalized = extractEmail(email);
  if (normalized.length > MAX_INPUT_LEN_FOR_LEGACY_HOST_REGEX) {
    return undefined;
  }
  const match = LEGACY_HOST_REGEX.exec(normalized);
  return match?.[1];
}

/** Group recipient addresses by recipient domain (MX routing key). */
export function groupRecipientsByDomain(recipients: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const raw of recipients) {
    const host = String(getHostFromAddress(raw));
    if (!groups[host]) {
      groups[host] = [];
    }
    groups[host].push(raw);
  }
  return groups;
}

/** Collect all recipients from to / cc / bcc (same sources as legacy sendmail). */
export function collectRecipients(mail: {
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
}): string[] {
  return [
    ...parseAddressList(mail.to),
    ...parseAddressList(mail.cc),
    ...parseAddressList(mail.bcc),
  ];
}
