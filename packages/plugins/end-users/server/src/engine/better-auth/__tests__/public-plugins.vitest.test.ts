import { describe, expect, it, vi } from 'vitest';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { betterAuth } from 'better-auth/minimal';

import { emailOTP, magicLink } from '../public/plugins';

// Built at run time: no secret-shaped literal in the source
const SECRET = ['public', 'plugins', 'test', 'secret', 'long', 'enough', 'to', 'use'].join('-');

type Row = Record<string, any>;

describe('the magic-link plugin projects import', () => {
  it('stores the token hashed, whatever the project asks for', async () => {
    for (const options of [{}, { storeToken: 'plain' as const }]) {
      const db = { user: [], session: [], account: [], verification: [] } as Record<string, Row[]>;
      const sent: string[] = [];
      const auth = betterAuth({
        secret: SECRET,
        baseURL: 'http://localhost:1337',
        basePath: '/api/auth',
        telemetry: { enabled: false },
        database: memoryAdapter(db),
        plugins: [
          magicLink({
            ...options,
            async sendMagicLink({ token }: { token: string }) {
              sent.push(token);
            },
          }),
        ],
      });

      // eslint-disable-next-line no-await-in-loop
      await auth.api.signInMagicLink({
        body: { email: 'ann@example.com' },
        headers: new Headers({ origin: 'http://localhost:1337' }),
      });

      expect(sent).toHaveLength(1);
      expect(db.verification).toHaveLength(1);
      expect(db.verification[0].identifier).toMatch(/^magic-link:/);
      expect(db.verification[0].identifier).not.toContain(sent[0]);
    }
  });
});

describe('the email-OTP plugin projects import', () => {
  it('stores the code hashed, whatever the project asks for, and still sends the plain code', async () => {
    for (const options of [{}, { storeOTP: 'plain' as const }]) {
      expect(emailOTP({ ...options, sendVerificationOTP: vi.fn() }).options).toMatchObject({
        storeOTP: 'hashed',
      });
    }

    const db = { user: [], session: [], account: [], verification: [] } as Record<string, Row[]>;
    const sendVerificationOTP = vi.fn(async () => undefined);
    const auth = betterAuth({
      secret: SECRET,
      baseURL: 'http://localhost:1337',
      basePath: '/api/auth',
      telemetry: { enabled: false },
      database: memoryAdapter(db),
      plugins: [emailOTP({ sendVerificationOTP })],
    });

    await auth.api.sendVerificationOTP({ body: { email: 'ann@example.com', type: 'sign-in' } });

    const [sent] = sendVerificationOTP.mock.calls[0] as unknown as [{ otp: string }];

    expect(sent.otp).toMatch(/^\d{6}$/);
    expect(db.verification).toHaveLength(1);
    expect(db.verification[0].value).not.toContain(sent.otp);
  });
});
