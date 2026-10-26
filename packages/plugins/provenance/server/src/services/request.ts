import type { Core } from '@strapi/types';

import { PROVENANCE_HEADER } from '../constants';
import { parseBodyClaims, parseProvenanceHeader } from '../domain/header';

import type { RequestSnapshot } from '../domain/declaration';
import type { TokenProfileService } from './token-profiles';

const TOKEN_STRATEGIES = ['admin-token', 'content-api-token'];
const SNAPSHOT_STATE_KEY = 'provenanceSnapshot';

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
    const isTokenRequest = strategy !== undefined && TOKEN_STRATEGIES.includes(strategy);

    let userId: string | number | undefined;

    if (strategy === 'users-permissions') {
      userId = credentials?.id;
    } else {
      // Admin sessions, admin tokens (owner) and the MCP server all set `state.user`
      userId = state.user?.id;
    }

    const tokenId: string | number | undefined = isTokenRequest ? credentials?.id : undefined;
    const isContentApi = state.route?.info?.type === 'content-api';

    const snapshot: RequestSnapshot = {
      auditSource: state.auditSource,
      strategy,
      userId,
      tokenId,
      tokenProfile: tokenId !== undefined ? await tokenProfiles.get(tokenId) : null,
      headerClaim: parseProvenanceHeader(ctx.request?.headers?.[PROVENANCE_HEADER]),
      // Admin routes send the entry itself as the body, where `provenance` could be an attribute
      bodyClaims: isContentApi ? parseBodyClaims(ctx.request?.body?.provenance) : {},
    };

    state[SNAPSHOT_STATE_KEY] = snapshot;

    return snapshot;
  },
});

export type RequestService = ReturnType<typeof createRequestService>;
