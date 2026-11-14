import type { Core } from '@strapi/types';

import { PROVENANCE_HEADER } from '../constants';
import { parseBodyClaims, parseProvenanceHeader } from '../domain/header';

import type { RequestSnapshot } from '../domain/declaration';
import type { AgentPrincipal, ClientClaim } from '../domain/types';
import type { TokenProfileService } from './token-profiles';

const TOKEN_STRATEGIES = new Set(['admin-token', 'content-api-token']);
const SNAPSHOT_STATE_KEY = 'provenanceSnapshot';
const EXECUTION_STATE_KEY = 'provenanceExecution';

/**
 * A write that runs inside the request of someone else on behalf of an agent, once a person
 * approved it. The request's own user is the reviewer, not the author of the values.
 */
export type AgentExecution = { agent: AgentPrincipal; claim?: ClientClaim | null };

/**
 * The agent behind a request, or `null`. The only place that knows how an agent shows up:
 * the agent auth strategy with an admin user of kind `agent` (Agent Governance RFC), or
 * `state.agent` as set by the gateway of the plugin prototype.
 */
export const resolveAgentPrincipal = (state: Record<string, any>): AgentPrincipal | null => {
  const execution: AgentExecution | undefined = state[EXECUTION_STATE_KEY];

  if (execution !== undefined) {
    return execution.agent;
  }

  if (state.agent?.id !== undefined) {
    return { id: state.agent.id, name: state.agent.name };
  }

  if (state.auth?.strategy?.name !== 'agent' && state.user?.kind !== 'agent') {
    return null;
  }

  const identity = state.user ?? state.auth?.credentials;

  return identity?.id !== undefined
    ? { id: identity.id, name: identity.name ?? identity.username ?? identity.firstname ?? '' }
    : null;
};

/**
 * Reads the signals of the current HTTP request. Computed once per request, since a single
 * request can trigger several Document Service writes.
 */
export const createRequestService = ({
  strapi,
  tokenProfiles,
}: {
  strapi: Core.Strapi;
  tokenProfiles: TokenProfileService;
}) => ({
  /**
   * Whether the request is the Content Manager list of `uid` filtered on entries with AI
   * content to review (`plugins[provenance][provenanceReview]=pending` in the admin URL).
   */
  isAiReviewListing(uid: string) {
    const ctx = strapi.requestContext.get();

    return (
      ctx?.state?.auth?.strategy?.name === 'admin' &&
      ctx.params?.model === uid &&
      ctx.query?.provenanceReview === 'pending'
    );
  },

  /**
   * Per-request cache of the "AI to review" list filter, by content type, locale and status.
   */
  getListingCache(): Map<string, Promise<string[] | null>> {
    const state = strapi.requestContext.get()?.state;

    if (state === undefined) {
      return new Map();
    }

    state.provenanceListing ??= new Map();

    return state.provenanceListing;
  },

  async getSnapshot(): Promise<RequestSnapshot | null> {
    const ctx = strapi.requestContext.get();

    if (ctx === undefined) {
      return null;
    }

    const state = ctx.state ?? {};

    if (state[SNAPSHOT_STATE_KEY] !== undefined) {
      return state[SNAPSHOT_STATE_KEY];
    }

    const strategy: string | undefined = state.auth?.strategy?.name;
    const credentials = state.auth?.credentials;
    const isTokenRequest = strategy !== undefined && TOKEN_STRATEGIES.has(strategy);

    let userId: string | number | undefined;

    if (strategy === 'users-permissions') {
      userId = credentials?.id;
    } else {
      // Admin sessions, admin tokens (owner) and the MCP server all set `state.user`
      userId = state.user?.id;
    }

    const tokenId: string | number | undefined = isTokenRequest ? credentials?.id : undefined;
    const isContentApi = state.route?.info?.type === 'content-api';
    const execution: AgentExecution | undefined = state[EXECUTION_STATE_KEY];

    const snapshot: RequestSnapshot = {
      auditSource: state.auditSource,
      strategy,
      userId,
      agent: resolveAgentPrincipal(state),
      tokenId,
      // Admin tokens get their identity from agents: profiles only qualify Content API tokens
      tokenProfile: strategy === 'content-api-token' ? await tokenProfiles.get(tokenId!) : null,
      // The request of a reviewer says nothing about what the agent claimed
      headerClaim:
        execution !== undefined
          ? (execution.claim ?? null)
          : parseProvenanceHeader(ctx.request?.headers?.[PROVENANCE_HEADER]),
      // Admin routes send the entry itself as the body, where `provenance` could be an attribute
      bodyClaims:
        isContentApi && execution === undefined
          ? parseBodyClaims(ctx.request?.body?.provenance)
          : {},
    };

    state[SNAPSHOT_STATE_KEY] = snapshot;

    return snapshot;
  },

  /**
   * Runs `run` with its writes attributed to the agent, whoever sent the request.
   */
  async withExecution<T>(execution: AgentExecution, run: () => Promise<T>): Promise<T> {
    const ctx = strapi.requestContext.get();

    if (ctx === undefined) {
      let output!: T;

      await strapi.requestContext.run(
        { state: { [EXECUTION_STATE_KEY]: execution }, request: { url: '' } } as any,
        async () => {
          output = await run();
        }
      );

      return output;
    }

    const { state } = ctx;

    state[EXECUTION_STATE_KEY] = execution;
    delete state[SNAPSHOT_STATE_KEY];

    try {
      return await run();
    } finally {
      delete state[EXECUTION_STATE_KEY];
      delete state[SNAPSHOT_STATE_KEY];
    }
  },
});

export type RequestService = ReturnType<typeof createRequestService>;
