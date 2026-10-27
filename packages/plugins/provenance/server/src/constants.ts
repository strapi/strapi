export const PLUGIN_ID = 'provenance';

export const FIELD_PROVENANCE_UID = 'plugin::provenance.field-provenance';
export const TOKEN_PROFILE_UID = 'plugin::provenance.token-profile';
export const DOCUMENT_LOCK_UID = 'plugin::provenance.document-lock';

/**
 * License feature of the governance part (Enterprise): the publish guard, the Review Workflows
 * rules, the "AI to review" filter and the proof export. Recording, labels and reviews are
 * available to every edition.
 */
export const GOVERNANCE_FEATURE = 'cms-ai-governance';

export const PROVENANCE_HEADER = 'strapi-provenance';

/**
 * Who wrote the current value of a field.
 *
 * - `ai-generated`: written by an AI (IPTC `trainedAlgorithmicMedia`)
 * - `ai-assisted`: AI output edited by a human, or the other way around
 *   (IPTC `compositeWithTrainedAlgorithmicMedia`)
 * - `human-entered`: typed or pasted by an authenticated admin user. Entered, not
 *   necessarily written: we attest the channel, we do not detect AI text.
 * - `automated`: written by an API token the admin qualified as a classic integration
 * - `unattributed`: no reliable signal. This is the default, never "human".
 */
export const SOURCES = [
  'ai-generated',
  'ai-assisted',
  'human-entered',
  'automated',
  'unattributed',
] as const;

/**
 * How the source was established, strongest first.
 */
export const SIGNALS = [
  'strapi-channel',
  'token',
  'client-declared',
  'admin-session',
  'none',
] as const;

/**
 * How an admin qualified an API token. Tokens without a profile are "unspecified".
 */
export const TOKEN_PROFILES = ['agent', 'integration', 'mixed'] as const;

/**
 * Attribute types whose value is tracked. Relations are not AI content and media is handled
 * separately later. A component or dynamic zone is tracked as one field: its instances have
 * no stable identity yet, so nested paths would not survive a reorder.
 */
export const TRACKED_ATTRIBUTE_TYPES = [
  'string',
  'text',
  'richtext',
  'blocks',
  'email',
  'uid',
  'json',
  'enumeration',
  'integer',
  'biginteger',
  'float',
  'decimal',
  'boolean',
  'date',
  'time',
  'datetime',
  'timestamp',
  'component',
  'dynamiczone',
] as const;
