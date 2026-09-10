import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

const { PolicyError } = errors;

/**
 * Raised at the cap. Extends `PolicyError` so the endpoint composer keeps the
 * public message and details (a bare `ForbiddenError` is masked into a 403).
 */
export class SpaceLimitError extends PolicyError<
  string,
  { code: 'SPACES_LIMIT_REACHED'; maxSpaces: number | null; count: number }
> {
  constructor(
    message: string,
    details: { code: 'SPACES_LIMIT_REACHED'; maxSpaces: number | null; count: number }
  ) {
    super(message, details);
    Object.defineProperty(this, 'name', { value: 'SpaceLimitError', enumerable: false });
  }
}

const SPACE_UID = 'plugin::spaces.space';
const FEATURE_NAME = 'multi-tenancy';

export interface SpaceLimits {
  /** `null` = unlimited. */
  maxSpaces: number | null;
  /** Every workspace, archived included, so restoring one cannot bypass the cap. */
  count: number;
  canCreate: boolean;
}

/**
 * Instance-level limits. The licence feature (`multi-tenancy` with a
 * `maxSpaces` option) wins over the plugin config, which is the self-hosted
 * fallback; neither set means unlimited.
 */
const limitsService = ({ strapi }: { strapi: Core.Strapi }) => ({
  getMaxSpaces(): number | null {
    const feature = strapi.ee?.features?.get?.(FEATURE_NAME) as
      | { options?: { maxSpaces?: unknown } }
      | boolean
      | undefined;
    const fromLicence =
      typeof feature === 'object' && feature !== null ? feature.options?.maxSpaces : undefined;
    if (Number.isInteger(fromLicence) && (fromLicence as number) > 0) {
      return fromLicence as number;
    }
    const fromConfig = strapi.plugin('spaces')?.config?.('maxSpaces');
    return Number.isInteger(fromConfig) && (fromConfig as number) > 0
      ? (fromConfig as number)
      : null;
  },

  async getUsage(): Promise<SpaceLimits> {
    const maxSpaces = this.getMaxSpaces();
    const count: number = await strapi.db.query(SPACE_UID).count();
    return { maxSpaces, count, canCreate: maxSpaces === null || count < maxSpaces };
  },

  async assertCanCreate(): Promise<void> {
    const usage = await this.getUsage();
    if (!usage.canCreate) {
      throw new SpaceLimitError(`Workspace limit reached (${usage.maxSpaces}).`, {
        code: 'SPACES_LIMIT_REACHED',
        maxSpaces: usage.maxSpaces,
        count: usage.count,
      });
    }
  },
});

type LimitsService = typeof limitsService;

export default limitsService;
export type { LimitsService };
