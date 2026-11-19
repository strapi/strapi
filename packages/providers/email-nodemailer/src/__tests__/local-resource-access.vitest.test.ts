import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import provider from '../index';

/**
 * These tests use the real nodemailer composer (streamTransport, no network) to prove that
 * caller-controlled email options (the body of `POST /email`) cannot make the provider read
 * local files or fetch URLs.
 */

const SECRET = 'SENTINEL_SECRET_LOCAL_FILE_CONTENT';

let tmpDir: string;
let secretFile: string;
let server: http.Server;
let serverUrl: string;
let serverHits = 0;

const createProvider = () =>
  provider.init({ streamTransport: true, buffer: true, newline: 'unix' } as never, {
    defaultFrom: 'from@example.com',
    defaultReplyTo: 'reply@example.com',
  });

const send = (extra: Record<string, unknown>) =>
  createProvider().send({
    to: 'victim@example.com',
    subject: 'subject',
    text: 'text',
    ...extra,
  } as never) as Promise<{ message: Buffer }>;

const leaksSecret = (raw: Buffer) => {
  const message = raw.toString();
  return (
    message.includes(SECRET) ||
    message.includes(Buffer.from(SECRET).toString('base64').slice(0, 24)) ||
    message.includes(`${SECRET}_HTTP`)
  );
};

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-email-nodemailer-'));
  secretFile = path.join(tmpDir, 'secret.txt');
  fs.writeFileSync(secretFile, SECRET);

  server = http.createServer((_req, res) => {
    serverHits += 1;
    res.end(`${SECRET}_HTTP`);
  });
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  serverUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}/resource`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('email-nodemailer: local file and URL access from caller input', () => {
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
    [
      'attachments[].href (http URL)',
      () => ({ attachments: [{ filename: 'a', href: serverUrl }] }),
    ],
    [
      'attachments[].path (http URL)',
      () => ({ attachments: [{ filename: 'a', path: serverUrl }] }),
    ],
    ['attachments[].raw {path}', () => ({ attachments: [{ raw: { path: secretFile } }] })],
    [
      'attachments[].content {path}',
      () => ({ attachments: [{ filename: 'a', content: { path: secretFile } }] }),
    ],
    [
      'attachments[].content {href}',
      () => ({ attachments: [{ filename: 'a', content: { href: serverUrl } }] }),
    ],
    ['attachments[] inline cid + path', () => ({ attachments: [{ cid: 'x', path: secretFile }] })],
    ['html {path}', () => ({ html: { path: secretFile } })],
    ['html {href}', () => ({ html: { href: serverUrl } })],
    ['text {path}', () => ({ text: { path: secretFile } })],
    ['watchHtml {path}', () => ({ watchHtml: { path: secretFile } })],
    ['amp {path}', () => ({ amp: { path: secretFile } })],
    [
      'alternatives[].path',
      () => ({ alternatives: [{ contentType: 'text/plain', path: secretFile }] }),
    ],
    [
      'alternatives[].href',
      () => ({ alternatives: [{ contentType: 'text/plain', href: serverUrl }] }),
    ],
    ['alternatives[].raw {path}', () => ({ alternatives: [{ raw: { path: secretFile } }] })],
    ['icalEvent.path', () => ({ icalEvent: { path: secretFile } })],
    ['icalEvent.href', () => ({ icalEvent: { href: serverUrl } })],
    ['icalEvent.content {path}', () => ({ icalEvent: { content: { path: secretFile } } })],
    ['raw {path}', () => ({ raw: { path: secretFile } })],
    ['raw {href}', () => ({ raw: { href: serverUrl } })],
    [
      'caller-supplied disableFileAccess/disableUrlAccess = false',
      () => ({
        disableFileAccess: false,
        disableUrlAccess: false,
        attachments: [{ filename: 'a', path: secretFile }],
      }),
    ],
  ];

  it.each(vectors)('rejects %s without reading the resource', async (_name, build) => {
    serverHits = 0;

    let leaked = false;
    let error: { code?: string } | undefined;
    try {
      const info = await send(build());
      leaked = leaksSecret(info.message);
    } catch (err) {
      error = err as { code?: string };
    }

    expect(leaked).toBe(false);
    expect(serverHits).toBe(0);
    expect(error?.code).toMatch(/^(EFILEACCESS|EURLACCESS)$/);
  });

  it('still allows inline data: URI attachments', async () => {
    const info = await send({
      attachments: [
        {
          filename: 'a.txt',
          path: `data:text/plain;base64,${Buffer.from('DATA_URI_OK').toString('base64')}`,
        },
      ],
    });

    expect(info.message.toString()).toContain(Buffer.from('DATA_URI_OK').toString('base64'));
  });
});
