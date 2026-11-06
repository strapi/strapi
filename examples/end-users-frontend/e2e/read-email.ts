import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Where the example Strapi writes its emails: `providers/file-email.js` of `examples/end-users`
 * (the email provider set in its `config/plugins.ts`) writes each one to `.tmp/emails`, as
 * `<timestamp>-<to>.json` holding `{ to, subject, html, text }`.
 */
const EMAILS_DIRECTORY = path.resolve(import.meta.dirname, '../../end-users/.tmp/emails');

export interface SentEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Same rule as the provider's, so the address finds its own file names */
const toFileName = (to: string) => to.replace(/[^a-zA-Z0-9@._+-]/g, '_');

const newestMatch = (to: string, subject: RegExp, since: number): SentEmail | undefined => {
  let files: string[];

  try {
    files = readdirSync(EMAILS_DIRECTORY);
  } catch {
    return undefined; // nothing was sent yet: there is no folder
  }

  const suffix = `-${toFileName(to)}.json`;

  const candidates = files
    .filter((file) => file.endsWith(suffix))
    .map((file) => ({ file, sentAt: Number(file.slice(0, file.length - suffix.length)) }))
    .filter(({ sentAt }) => sentAt >= since)
    .sort((a, b) => b.sentAt - a.sentAt);

  for (const { file } of candidates) {
    const email = JSON.parse(readFileSync(path.join(EMAILS_DIRECTORY, file), 'utf8')) as SentEmail;

    if (subject.test(email.subject)) {
      return email;
    }
  }

  return undefined;
};

/**
 * Waits for an email to `to` whose subject matches, sent at or after `since` (a `Date.now()` taken
 * before the action that sends it, so an earlier email with the same subject is never read).
 */
export const waitForEmail = async (
  to: string,
  subject: RegExp,
  since: number,
  timeout = 20_000
): Promise<SentEmail> => {
  const deadline = Date.now() + timeout;

  for (;;) {
    const email = newestMatch(to, subject, since);

    if (email) {
      return email;
    }

    if (Date.now() > deadline) {
      throw new Error(`No email to ${to} with a subject matching ${subject} within ${timeout} ms.`);
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }
};

/**
 * The link of an email, read from its plain-text body (the HTML one has its `&` escaped). Every
 * template has exactly one.
 */
export const linkIn = (email: SentEmail): string => {
  const link = email.text.match(/https?:\/\/\S+/)?.[0];

  if (!link) {
    throw new Error(`No link in the email "${email.subject}":\n${email.text}`);
  }

  return link;
};
