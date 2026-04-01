/**
 * Address parsing and grouping — aligned with the legacy `sendmail` npm package
 * (guileen/node-sendmail) behavior for recipient grouping and domain extraction.
 */

/** Extract bare email from `Name <email@domain>` or return trimmed input. */
export function extractEmail(address: string): string {
  const trimmed = address.trim();
  const angle = /<([^>]+)>/.exec(trimmed);
  if (angle) {
    return angle[1].trim();
  }
  return trimmed;
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

/** Domain part of an email address (after @). */
export function getHostFromAddress(email: string): string {
  const m = /[^@]+@([\w\d\-.]+)/.exec(email);
  return m ? m[1] : 'localhost';
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
