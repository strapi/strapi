import type { SIGNALS, SOURCES, TOKEN_PROFILES } from '../constants';

export type Source = (typeof SOURCES)[number];
export type Signal = (typeof SIGNALS)[number];
export type TokenProfile = (typeof TOKEN_PROFILES)[number];

/**
 * An agent known to the server through its own identity, not through a client claim.
 */
export type AgentPrincipal = { id: string | number; name: string };

export type Actor =
  | { type: 'admin-user'; id: string | number }
  | { type: 'agent'; id: string | number }
  | { type: 'api-token'; id: string | number }
  | { type: 'end-user'; id: string | number }
  | { type: 'system' };

/**
 * What a write says about who produced a field value, before it is combined with the
 * field's previous provenance.
 *
 * - `ai`: an AI produced it (`edited` when the AI rewrote an existing value)
 * - `human`: an authenticated admin user entered it
 * - `automated`: a qualified integration wrote it
 * - `none`: nothing reliable is known
 */
export type Declaration = {
  origin: 'ai' | 'human' | 'automated' | 'none';
  signal: Signal;
  actor: Actor;
  edited?: boolean;
  model?: string;
  agent?: string;
};

/**
 * Metadata a client may attach to a write, through the `Strapi-Provenance` header for the
 * whole request or through the `provenance` body key for single fields.
 */
export type ClientClaim = {
  source?: string;
  action?: string;
  model?: string;
  agent?: string;
};

export type ProvenanceRow = {
  id?: number;
  contentType: string;
  documentId: string;
  locale: string | null;
  status: 'draft' | 'published';
  fieldPath: string;
  source: Source;
  signal: Signal;
  actorType: Actor['type'];
  actorId: string | null;
  model: string | null;
  agent: string | null;
  valueHash: string;
  reviewedById: string | null;
  reviewedAt: string | Date | null;
  reviewedHash: string | null;
  recordedAt: string | Date;
};
