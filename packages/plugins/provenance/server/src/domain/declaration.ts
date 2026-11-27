import { claimsAi, claimsEdit } from './header';

import type { Actor, AgentPrincipal, ClientClaim, Declaration, TokenProfile } from './types';

/**
 * What the plugin knows about the request that triggered a write, extracted from the Koa
 * context so the rules below stay free of Strapi and Koa.
 */
export type RequestSnapshot = {
  /** Set when the write comes from an agent, or runs on its behalf after an approval */
  agent?: AgentPrincipal | null;
  auditSource?: string;
  strategy?: string;
  userId?: string | number;
  tokenId?: string | number;
  tokenProfile?: TokenProfile | null;
  headerClaim: ClientClaim | null;
  bodyClaims: Record<string, ClientClaim>;
};

const NO_SIGNAL: Declaration = { origin: 'none', signal: 'none', actor: { type: 'system' } };

const tokenDeclaration = (snapshot: RequestSnapshot): Declaration => {
  const actor: Actor =
    snapshot.tokenId !== undefined
      ? { type: 'api-token', id: snapshot.tokenId }
      : { type: 'system' };

  switch (snapshot.tokenProfile) {
    case 'agent':
      return { origin: 'ai', signal: 'token', actor };
    case 'integration':
      return { origin: 'automated', signal: 'token', actor };
    // Mixed and unspecified tokens: only the client knows, request by request
    default:
      return { origin: 'none', signal: 'none', actor };
  }
};

/**
 * The declaration that applies to every field of the request, from the signals the server
 * controls (strongest first): the agent identity, Strapi's own AI channels, the token profile,
 * the admin session.
 */
export const resolveBaseDeclaration = (snapshot: RequestSnapshot | null): Declaration => {
  if (snapshot === null) {
    // Scripts, cron jobs, bootstrap code: no request, nothing to attest
    return NO_SIGNAL;
  }

  // Before the MCP marker: an agent connected through the MCP server keeps its name
  if (snapshot.agent) {
    return {
      origin: 'ai',
      signal: 'agent-identity',
      agent: snapshot.agent.name,
      actor: { type: 'agent', id: snapshot.agent.id },
    };
  }

  if (snapshot.auditSource === 'mcp') {
    return {
      origin: 'ai',
      signal: 'strapi-channel',
      agent: 'strapi-mcp',
      actor:
        snapshot.userId !== undefined
          ? { type: 'admin-user', id: snapshot.userId }
          : { type: 'system' },
    };
  }

  switch (snapshot.strategy) {
    case 'admin':
      return snapshot.userId !== undefined
        ? {
            origin: 'human',
            signal: 'admin-session',
            actor: { type: 'admin-user', id: snapshot.userId },
          }
        : NO_SIGNAL;
    case 'admin-token':
    case 'content-api-token':
      return tokenDeclaration(snapshot);
    case 'users-permissions':
      return {
        ...NO_SIGNAL,
        actor:
          snapshot.userId !== undefined
            ? { type: 'end-user', id: snapshot.userId }
            : { type: 'system' },
      };
    default:
      return NO_SIGNAL;
  }
};

/**
 * Reviews and AI declarations speak for a person: an admin session, not a token, an agent or
 * the MCP server, even one acting for an admin user.
 */
export const isHumanSession = (snapshot: RequestSnapshot | null) => {
  return snapshot?.strategy === 'admin' && resolveBaseDeclaration(snapshot).origin === 'human';
};

/**
 * Applies the client claim for one field on top of the base declaration.
 *
 * The rule is asymmetric: a client can declare AI or add details (model, agent), it can
 * never turn a write into "human" or "automated". Under-declaring AI is the regulatory
 * risk, so a claim that does not say AI is ignored.
 */
export const resolveFieldDeclaration = (
  base: Declaration,
  claim: ClientClaim | null | undefined
): Declaration => {
  if (!claimsAi(claim)) {
    return base;
  }

  const edited = claimsEdit(claim);

  if (base.origin === 'ai') {
    return {
      ...base,
      edited: base.edited || edited,
      model: claim?.model ?? base.model,
      // A name the server knows cannot be replaced by a claim
      agent: base.signal === 'agent-identity' ? base.agent : (claim?.agent ?? base.agent),
    };
  }

  return {
    origin: 'ai',
    signal: 'client-declared',
    actor: base.actor,
    edited,
    model: claim?.model,
    agent: claim?.agent,
  };
};

/**
 * The claim that applies to a field: the body's per-field claim wins over the header.
 */
export const claimForField = (snapshot: RequestSnapshot | null, field: string) => {
  if (snapshot === null) {
    return null;
  }

  const body = snapshot.bodyClaims[field];
  const header = snapshot.headerClaim;

  if (body === undefined) {
    return header;
  }

  // The body adds detail per field; it cannot hide an AI declaration of the header
  return {
    ...header,
    ...body,
    source: claimsAi(body) || !claimsAi(header) ? (body.source ?? header?.source) : header?.source,
  };
};
