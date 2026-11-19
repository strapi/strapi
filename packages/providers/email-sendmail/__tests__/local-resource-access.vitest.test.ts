import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import provider from '../src/index';
import { MinimalSmtpServer } from './helpers/minimal-smtp-server';

/**
 * Real nodemailer composer + real (local, in-process) SMTP listener: proves that caller-controlled
 * send options (the body of `POST /email` is spread into the mail) cannot make the sendmail
 * provider read local files or fetch URLs.
 */

const SECRET = 'SENTINEL_SECRET_LOCAL_FILE_CONTENT';

let tmpDir: string;
let secretFile: string;
let httpServer: http.Server;
let httpUrl: string;
let httpHits = 0;

let smtp: MinimalSmtpServer;

const send = (extra: Record<string, unknown>) =>
  provider
    .init(
      { devPort: smtp.port, devHost: '127.0.0.1', silent: true },
      { defaultFrom: 'App <noreply@app.com>', defaultReplyTo: 'support@app.com' }
    )
    .send({ to: 'victim@target.com', subject: 'subject', text: 'text', ...extra });

const leaksSecret = (data: string | null) =>
  !!data &&
  (data.includes(SECRET) ||
    data.includes(Buffer.from(SECRET).toString('base64').slice(0, 24)) ||
    data.includes(`${SECRET}_HTTP`));

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-email-sendmail-'));
  secretFile = path.join(tmpDir, 'secret.txt');
  fs.writeFileSync(secretFile, SECRET);

  httpServer = http.createServer((_req, res) => {
    httpHits += 1;
    res.end(`${SECRET}_HTTP`);
  });
  await new Promise<void>((resolve) => {
    httpServer.listen(0, '127.0.0.1', () => resolve());
  });
  httpUrl = `http://127.0.0.1:${(httpServer.address() as { port: number }).port}/resource`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(async () => {
  httpHits = 0;
  smtp = new MinimalSmtpServer();
  await smtp.listen();
});

afterEach(async () => {
  await smtp.close();
});

describe('email-sendmail: local file and URL access from caller input', () => {
  const vectors: Array<[string, () => Record<string, unknown>]> = [
    [
      'attachments[].path (absolute file)',
      () => ({ attachments: [{ filename: 'a', path: secretFile }] }),
    ],
    [
      'attachments[].path (file:// URL)',
      () => ({ attachments: [{ filename: 'a', path: `file://${secretFile}` }] }),
    ],
    [
      'attachments[].href (file:// URL)',
      () => ({ attachments: [{ filename: 'a', href: `file://${secretFile}` }] }),
    ],
    ['attachments[].href (http URL)', () => ({ attachments: [{ filename: 'a', href: httpUrl }] })],
    ['attachments[].path (http URL)', () => ({ attachments: [{ filename: 'a', path: httpUrl }] })],
    ['attachments[].raw {path}', () => ({ attachments: [{ raw: { path: secretFile } }] })],
    [
      'attachments[].content {path}',
      () => ({ attachments: [{ filename: 'a', content: { path: secretFile } }] }),
    ],
    ['html {path}', () => ({ html: { path: secretFile } })],
    ['html {href}', () => ({ html: { href: httpUrl } })],
    ['text {path}', () => ({ text: { path: secretFile } })],
    ['watchHtml {path}', () => ({ watchHtml: { path: secretFile } })],
    ['amp {path}', () => ({ amp: { path: secretFile } })],
    [
      'alternatives[].path',
      () => ({ alternatives: [{ contentType: 'text/plain', path: secretFile }] }),
    ],
    [
      'alternatives[].href',
      () => ({ alternatives: [{ contentType: 'text/plain', href: httpUrl }] }),
    ],
    ['icalEvent.path', () => ({ icalEvent: { path: secretFile } })],
    ['icalEvent.href', () => ({ icalEvent: { href: httpUrl } })],
    ['raw {path}', () => ({ raw: { path: secretFile } })],
    ['raw {href}', () => ({ raw: { href: httpUrl } })],
    [
      'caller-supplied disableFileAccess/disableUrlAccess = false',
      () => ({
        disableFileAccess: false,
        disableUrlAccess: false,
        attachments: [{ filename: 'a', path: secretFile }],
      }),
    ],
  ];

  it.each(vectors)('does not read or fetch the resource for %s', async (_name, build) => {
    await send(build()).catch(() => undefined);

    expect(leaksSecret(smtp.lastData)).toBe(false);
    expect(httpHits).toBe(0);
  });
});
