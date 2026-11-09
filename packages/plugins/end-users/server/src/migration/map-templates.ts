export type UpEmailKey = 'reset_password' | 'email_confirmation';

export interface UpEmailTemplate {
  options?: {
    from?: { name?: string; email?: string };
    response_email?: string;
    object?: string;
    message?: string;
  };
}

export type TemplateTranslation =
  | {
      kind: 'translated';
      key: 'end-users.reset-password' | 'end-users.verify-email';
      locale: 'en';
      subject: string;
      html: string;
      text: string;
      /** The stored sender or reply-to differs from the seeded one: it belongs in the email plugin's config */
      sender: boolean;
    }
  | { kind: 'default'; key: string }
  | { kind: 'untranslated'; key: string; placeholders: string[] };

const KEYS: Record<UpEmailKey, 'end-users.reset-password' | 'end-users.verify-email'> = {
  reset_password: 'end-users.reset-password',
  email_confirmation: 'end-users.verify-email',
};

/** What Users & Permissions seeds, compared whitespace-normalised */
const SEEDED: Record<UpEmailKey, { object: string; message: string }> = {
  reset_password: {
    object: 'Reset password',
    message: `<p>We heard that you lost your password. Sorry about that!</p>

<p>But don’t worry! You can use the following link to reset your password:</p>
<p><%= URL %>?code=<%= TOKEN %></p>

<p>Thanks.</p>`,
  },
  email_confirmation: {
    object: 'Account confirmation',
    message: `<p>Thank you for registering!</p>

<p>You have to confirm your email address. Please click on the link below.</p>

<p><%= URL %>?confirmation=<%= CODE %></p>

<p>Thanks.</p>`,
  },
};

const SEEDED_SENDER = { name: 'Administration Panel', email: 'no-reply@strapi.io' };

const normalise = (value: string) => value.replace(/\s+/g, ' ').trim();

const TAG = '<%[=-]?\\s*';
const END = '\\s*%>';
const LINK = new RegExp(`${TAG}URL${END}\\?(?:code|confirmation)=${TAG}(?:TOKEN|CODE)${END}`, 'g');
const EMAIL = new RegExp(`${TAG}USER\\.email${END}`, 'g');
const USERNAME = new RegExp(`${TAG}USER\\.username${END}`, 'g');
const ANY_TAG = /<%[=-]?([\s\S]*?)%>/g;

/** The text with what maps rewritten, and the expressions of every `<% %>` left in it */
const rewrite = (value: string): { value: string; left: string[] } => {
  const mapped = value
    .replace(LINK, '{{ url }}')
    .replace(EMAIL, '{{ user.email }}')
    .replace(USERNAME, '{{ user.name }}');
  const left = [...mapped.matchAll(ANY_TAG)].map((match) => normalise(match[1]));

  return { value: mapped, left };
};

const htmlToText = (html: string): string =>
  html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * Reads one stored Users & Permissions email template. The seeded default is skipped, a template
 * whose `<% %>` tags all map is translated, and anything else keeps the end-users default and
 * names what could not be carried over.
 */
export const translateUpTemplate = (
  upKey: UpEmailKey,
  stored: UpEmailTemplate
): TemplateTranslation => {
  const key = KEYS[upKey];
  const options = stored?.options ?? {};
  const message = options.message ?? '';
  const subject = options.object ?? '';
  const seeded = SEEDED[upKey];

  if (
    !normalise(message) ||
    (normalise(message) === normalise(seeded.message) &&
      normalise(subject) === normalise(seeded.object))
  ) {
    return { kind: 'default', key };
  }

  const html = rewrite(message);
  const title = rewrite(subject);
  const placeholders = [...new Set([...html.left, ...title.left])];

  if (placeholders.length > 0) {
    return { kind: 'untranslated', key, placeholders };
  }

  const from = options.from ?? {};
  const sender =
    Boolean(options.response_email?.trim()) ||
    (from.name !== undefined && from.name !== SEEDED_SENDER.name) ||
    (from.email !== undefined && from.email !== SEEDED_SENDER.email);

  return {
    kind: 'translated',
    key,
    locale: 'en',
    subject: title.value,
    html: html.value,
    text: htmlToText(html.value),
    sender,
  };
};
