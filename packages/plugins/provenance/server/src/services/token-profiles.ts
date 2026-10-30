import type { Core } from '@strapi/types';

import { TOKEN_PROFILE_UID } from '../constants';

import type { TokenProfile } from '../domain/types';

// Profiles change rarely and are read on every write made with a token
const CACHE_TTL_MS = 30_000;

type CachedProfile = { profile: TokenProfile | null; expiresAt: number };

export type TokenWithProfile = {
  id: string;
  name: string;
  description: string | null;
  kind: 'content-api' | 'admin';
  type: string | null;
  profile: TokenProfile | null;
};

const toToken = (token: Record<string, any>) => ({
  id: String(token.id),
  // Tokens created before kinds existed are content API tokens
  kind: (token.kind as TokenWithProfile['kind'] | null) ?? 'content-api',
});

export const createTokenProfileService = ({ strapi }: { strapi: Core.Strapi }) => {
  const cache = new Map<string, CachedProfile>();

  return {
    async get(tokenId: string | number): Promise<TokenProfile | null> {
      const key = String(tokenId);
      const cached = cache.get(key);

      if (cached !== undefined && cached.expiresAt > Date.now()) {
        return cached.profile;
      }

      const row = await strapi.db.query(TOKEN_PROFILE_UID).findOne({
        select: ['profile'],
        where: { tokenId: key },
      });

      const profile = (row?.profile as TokenProfile | undefined) ?? null;
      cache.set(key, { profile, expiresAt: Date.now() + CACHE_TTL_MS });

      return profile;
    },

    async set(tokenId: string | number, profile: TokenProfile | null) {
      const key = String(tokenId);

      await strapi.db.query(TOKEN_PROFILE_UID).delete({ where: { tokenId: key } });

      if (profile !== null) {
        await strapi.db.query(TOKEN_PROFILE_UID).create({ data: { tokenId: key, profile } });
      }

      cache.delete(key);
    },

    /**
     * Every Content API token with its profile.
     */
    async list(): Promise<TokenWithProfile[]> {
      const [tokens, profiles] = await Promise.all([
        strapi.db.query('admin::api-token').findMany({
          select: ['id', 'name', 'description', 'kind', 'type'],
          orderBy: { name: 'asc' },
        }),
        strapi.db.query(TOKEN_PROFILE_UID).findMany({ select: ['tokenId', 'profile'] }),
      ]);

      const profileByToken = new Map<string, TokenProfile>(
        profiles.map((row: { tokenId: string; profile: TokenProfile }) => [
          row.tokenId,
          row.profile,
        ])
      );

      const contentApiTokens = tokens.filter(
        (token: Record<string, any>) => toToken(token).kind === 'content-api'
      );

      return contentApiTokens.map((token: Record<string, any>) => ({
        ...toToken(token),
        name: token.name as string,
        description: (token.description as string | null) ?? null,
        type: (token.type as string | null) ?? null,
        profile: profileByToken.get(String(token.id)) ?? null,
      }));
    },

    async find(tokenId: string | number) {
      const token = await strapi.db.query('admin::api-token').findOne({
        select: ['id', 'kind'],
        where: { id: tokenId },
      });

      return token ? toToken(token) : null;
    },
  };
};

export type TokenProfileService = ReturnType<typeof createTokenProfileService>;
