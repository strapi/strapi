import jwt from 'jsonwebtoken';

const CONSENT_TICKET_AUDIENCE = 'strapi-mcp-oauth-consent';

export interface ConsentTicketPayload {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  scope?: string;
  state?: string;
  resource?: string;
}

export const signConsentTicket = (
  payload: ConsentTicketPayload,
  secret: string,
  lifespanSeconds: number
): string =>
  jwt.sign({ ...payload }, secret, {
    algorithm: 'HS256',
    audience: CONSENT_TICKET_AUDIENCE,
    expiresIn: lifespanSeconds,
  });

export const verifyConsentTicket = (
  ticket: unknown,
  secret: string
): ConsentTicketPayload | null => {
  if (typeof ticket !== 'string' || ticket.length === 0 || ticket.length > 4096) {
    return null;
  }

  try {
    const payload = jwt.verify(ticket, secret, {
      algorithms: ['HS256'],
      audience: CONSENT_TICKET_AUDIENCE,
    }) as jwt.JwtPayload & Partial<ConsentTicketPayload>;

    if (
      typeof payload.clientId !== 'string' ||
      typeof payload.redirectUri !== 'string' ||
      typeof payload.codeChallenge !== 'string' ||
      payload.codeChallengeMethod !== 'S256'
    ) {
      return null;
    }

    return {
      clientId: payload.clientId,
      redirectUri: payload.redirectUri,
      codeChallenge: payload.codeChallenge,
      codeChallengeMethod: payload.codeChallengeMethod,
      ...(typeof payload.scope === 'string' ? { scope: payload.scope } : {}),
      ...(typeof payload.state === 'string' ? { state: payload.state } : {}),
      ...(typeof payload.resource === 'string' ? { resource: payload.resource } : {}),
    };
  } catch {
    return null;
  }
};
