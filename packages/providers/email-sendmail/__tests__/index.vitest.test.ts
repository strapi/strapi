import { describe, it, expect, beforeEach, afterEach, vi, type MockedFunction } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { resolveMx } from 'dns/promises';

import provider from '../src/index';
import { MinimalSmtpServer } from './helpers/minimal-smtp-server';

vi.mock('dns/promises', () => ({
  resolveMx: vi.fn(),
}));

const mockedResolveMx = resolveMx as MockedFunction<typeof resolveMx>;

describe('@strapi/provider-email-sendmail', () => {
  describe('init + send (integration against minimal SMTP)', () => {
    let server: MinimalSmtpServer;

    beforeEach(async () => {
      server = new MinimalSmtpServer();
      await server.listen();
      mockedResolveMx.mockReset();
    });

    afterEach(async () => {
      await server.close();
    });

    it('delivers mail in devPort mode (no DNS) to the test server', async () => {
      const instance = provider.init(
        {
          devPort: server.port,
          devHost: '127.0.0.1',
          silent: true,
        },
        {
          defaultFrom: 'App <noreply@app.com>',
          defaultReplyTo: 'support@app.com',
        }
      );

      await instance.send({
        to: 'recipient@target.com',
        cc: '',
        bcc: '',
        subject: 'Test subject',
        text: 'Plain',
        html: '<p>HTML</p>',
      });

      expect(server.lastRcptTo).toContain('recipient@target.com');
      expect(server.lastData).toContain('Test subject');
      expect(server.lastData).toContain('Plain');
      expect(server.lastMailFrom).toBe('noreply@app.com');
    });

    it('merges silent: true by default and allows override', async () => {
      const debug = vi.fn();
      const instance = provider.init(
        {
          devPort: server.port,
          devHost: '127.0.0.1',
          silent: false,
          logger: { debug },
        },
        {
          defaultFrom: 'noreply@app.com',
        }
      );

      await instance.send({
        to: 'a@b.com',
        cc: '',
        bcc: '',
        subject: 'S',
        text: 'T',
        html: 'T',
      });

      expect(server.sessions).toBeGreaterThan(0);
    });

    it('uses defaultFrom and defaultReplyTo when omitted on send', async () => {
      const instance = provider.init(
        { devPort: server.port, devHost: '127.0.0.1', silent: true },
        {
          defaultFrom: 'default-from@x.com',
          defaultReplyTo: 'default-reply@x.com',
        }
      );

      await instance.send({
        to: 'r@y.com',
        cc: '',
        bcc: '',
        subject: 'Subj',
        text: 'Body',
        html: 'Body',
      });

      expect(server.lastData).toContain('default-from@x.com');
      expect(server.lastData).toContain('default-reply@x.com');
    });

    it('sends separate SMTP sessions for multiple recipient domains', async () => {
      mockedResolveMx.mockImplementation(async (domain: string) => {
        if (domain === 'one.com') {
          return [{ exchange: '127.0.0.1', priority: 0 }];
        }
        if (domain === 'two.org') {
          return [{ exchange: '127.0.0.1', priority: 0 }];
        }
        throw new Error(`unexpected domain ${domain}`);
      });

      const instance = provider.init(
        {
          smtpPort: server.port,
          silent: true,
        },
        { defaultFrom: 's@from.com' }
      );

      await instance.send({
        to: 'a@one.com, b@two.org',
        cc: '',
        bcc: '',
        subject: 'Multi',
        text: 'Hi',
        html: 'Hi',
      });

      expect(server.sessions).toBe(2);
    });

    it('passes through extra mail fields (attachments) to nodemailer', async () => {
      const instance = provider.init(
        { devPort: server.port, devHost: '127.0.0.1', silent: true },
        { defaultFrom: 'from@test.com' }
      );

      await instance.send({
        to: 't@test.com',
        cc: '',
        bcc: '',
        subject: 'With attachment',
        text: 'See attach',
        html: 'See attach',
        attachments: [{ filename: 'a.txt', content: 'x' }],
      } as Parameters<typeof instance.send>[0]);

      expect(server.lastData).toContain('attachment');
    });

    it('applies DKIM options when privateKey is set', async () => {
      const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
      const pem = privateKey.export({ type: 'pkcs1', format: 'pem' }) as string;

      const instance = provider.init(
        {
          devPort: server.port,
          devHost: '127.0.0.1',
          silent: true,
          dkim: {
            privateKey: pem,
            keySelector: 'strapi',
          },
        },
        { defaultFrom: 'signer@fromdomain.com' }
      );

      await instance.send({
        to: 'r@remote.com',
        cc: '',
        bcc: '',
        subject: 'Signed',
        text: 'T',
        html: 'T',
      });

      expect(server.lastData).toMatch(/DKIM-Signature/i);
    });
  });

  describe('errors', () => {
    let server: MinimalSmtpServer;

    beforeEach(async () => {
      server = new MinimalSmtpServer();
      await server.listen();
      mockedResolveMx.mockReset();
    });

    afterEach(async () => {
      await server.close();
    });

    it('rejects when send has no recipients', async () => {
      const instance = provider.init(
        { devPort: server.port, devHost: '127.0.0.1', silent: true },
        { defaultFrom: 'a@b.com' }
      );

      await expect(
        instance.send({
          to: '',
          cc: '',
          bcc: '',
          subject: 'x',
          text: 'y',
          html: 'y',
        })
      ).rejects.toThrow('No recipients');
    });
  });

  describe('attachment file/URL access', () => {
    let server: MinimalSmtpServer;

    beforeEach(async () => {
      server = new MinimalSmtpServer();
      await server.listen();
      mockedResolveMx.mockReset();
    });

    afterEach(async () => {
      await server.close();
    });

    it('does not read a local file referenced by attachments[].path', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'sendmail-attach-'));
      const secretPath = join(dir, 'secret.txt');
      const secret = 'FILE_ACCESS_SHOULD_BE_BLOCKED_9f3a';
      writeFileSync(secretPath, secret);

      const errors: unknown[] = [];
      const instance = provider.init(
        {
          devPort: server.port,
          devHost: '127.0.0.1',
          logger: { error: (...args: unknown[]) => errors.push(...args) },
        },
        { defaultFrom: 'a@b.com' }
      );

      await expect(
        instance.send({
          to: 'recipient@target.com',
          cc: '',
          bcc: '',
          subject: 'S',
          text: 'T',
          html: 'T',
          attachments: [{ path: secretPath }],
        } as Parameters<typeof instance.send>[0])
      ).rejects.toThrow();

      // nodemailer refuses to open the file rather than streaming it into the message.
      expect(errors.some((e) => /access rejected/i.test(String((e as Error)?.message ?? e)))).toBe(
        true
      );
      // The file content never reaches the SMTP peer.
      expect(server.lastData ?? '').not.toContain(secret);
    });

    it('does not fetch a URL referenced by attachments[].href', async () => {
      const errors: unknown[] = [];
      const instance = provider.init(
        {
          devPort: server.port,
          devHost: '127.0.0.1',
          logger: { error: (...args: unknown[]) => errors.push(...args) },
        },
        { defaultFrom: 'a@b.com' }
      );

      await expect(
        instance.send({
          to: 'recipient@target.com',
          cc: '',
          bcc: '',
          subject: 'S',
          text: 'T',
          html: 'T',
          attachments: [{ href: 'http://127.0.0.1:1/internal' }],
        } as Parameters<typeof instance.send>[0])
      ).rejects.toThrow();

      expect(errors.some((e) => /access rejected/i.test(String((e as Error)?.message ?? e)))).toBe(
        true
      );
    });

    it('still delivers an inline-content attachment', async () => {
      const instance = provider.init(
        { devPort: server.port, devHost: '127.0.0.1', silent: true },
        { defaultFrom: 'a@b.com' }
      );

      await instance.send({
        to: 'recipient@target.com',
        cc: '',
        bcc: '',
        subject: 'S',
        text: 'T',
        html: 'T',
        attachments: [{ filename: 'a.txt', content: 'hello' }],
      } as Parameters<typeof instance.send>[0]);

      // base64 of "hello"
      expect(server.lastData).toContain('aGVsbG8=');
    });
  });
});
