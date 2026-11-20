import { describe, test, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import {
  signConsentTicket,
  verifyConsentTicket,
  type ConsentTicketPayload,
} from '../consent-ticket';

const SECRET = 'test-secret';

const payload: ConsentTicketPayload = {
  clientId: 'client-1',
  redirectUri: 'https://example.com/cb',
  codeChallenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  codeChallengeMethod: 'S256',
  scope: 'mcp',
  state: 'xyz',
  resource: 'http://localhost:1337/mcp',
};

describe('consent-ticket', () => {
  test('round-trips the payload', () => {
    const ticket = signConsentTicket(payload, SECRET, 300);

    expect(verifyConsentTicket(ticket, SECRET)).toEqual(payload);
  });

  test('omits optional fields that were not set', () => {
    const minimal: ConsentTicketPayload = {
      clientId: 'client-1',
      redirectUri: 'https://example.com/cb',
      codeChallenge: payload.codeChallenge,
      codeChallengeMethod: 'S256',
    };

    const result = verifyConsentTicket(signConsentTicket(minimal, SECRET, 300), SECRET);

    expect(result).toEqual(minimal);
    expect(result).not.toHaveProperty('scope');
    expect(result).not.toHaveProperty('state');
  });

  test('rejects an expired ticket', () => {
    const ticket = signConsentTicket(payload, SECRET, -10);

    expect(verifyConsentTicket(ticket, SECRET)).toBeNull();
  });

  test('rejects a ticket signed with another secret', () => {
    const ticket = signConsentTicket(payload, 'other-secret', 300);

    expect(verifyConsentTicket(ticket, SECRET)).toBeNull();
  });

  test('rejects a token with the right secret but the wrong audience', () => {
    const ticket = jwt.sign({ ...payload }, SECRET, {
      algorithm: 'HS256',
      audience: 'something-else',
      expiresIn: 300,
    });

    expect(verifyConsentTicket(ticket, SECRET)).toBeNull();
  });

  test('rejects non-string and oversized inputs', () => {
    expect(verifyConsentTicket(undefined, SECRET)).toBeNull();
    expect(verifyConsentTicket(42, SECRET)).toBeNull();
    expect(verifyConsentTicket('x'.repeat(5000), SECRET)).toBeNull();
  });

  test('rejects a valid token missing required claims', () => {
    const ticket = jwt.sign({ clientId: 'client-1' }, SECRET, {
      algorithm: 'HS256',
      audience: 'strapi-mcp-oauth-consent',
      expiresIn: 300,
    });

    expect(verifyConsentTicket(ticket, SECRET)).toBeNull();
  });
});
