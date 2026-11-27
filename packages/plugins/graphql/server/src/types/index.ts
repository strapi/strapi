import type createBuilders from '../services/builders';
import type createConstants from '../services/constants';
import type createContentAPI from '../services/content-api';
import type createFormat from '../services/format';
import type createInternals from '../services/internals';
import type createUtils from '../services/utils';
import type { ExtensionService, TypeRegistry, TypeRegistryService } from './services';

export type * from './services';

/**
 * `strapi.config.get('plugin::graphql')`: the plugin config merged with its defaults
 * (`server/src/config/default-config.ts`). The other keys are optional.
 */
export type GraphQLConfig = {
  shadowCRUD: boolean;
  endpoint: string;
  subscriptions: boolean;
  /** `-1` for no limit. */
  maxLimit: number;
  apolloServer: Record<string, unknown>;
  /** From `STRAPI_GRAPHQL_V4_COMPATIBILITY_MODE` when the config does not set it. */
  v4CompatibilityMode: boolean | string;
  defaultLimit?: number;
  depthLimit?: number;
  playgroundAlways?: boolean;
  /** A function receives the Strapi instance and returns an Apollo plugin or a boolean. */
  landingPage?: boolean | ((strapi?: never) => unknown);
  generateArtifacts?: boolean;
  artifacts?: { schema?: string | boolean; typegen?: string | boolean };
};

type BuildersImplementation = ReturnType<typeof createBuilders>;
type BuildersUtilsImplementation = BuildersImplementation['utils'];

/**
 * The registered `builders` service. The implementation keeps develop's published types: the
 * declaration emitter prints the helpers it reads from other graphql services as `any`, so the
 * contract writes their results as the code builds them.
 */
export type BuildersService = Omit<BuildersImplementation, 'new' | 'utils'> & {
  /** Callers pass the registry of the schema being built (`services/content-api/index.ts:45`). */
  'new'(name: string, registry: TypeRegistry): ReturnType<BuildersImplementation['new']>;
  utils: Omit<
    BuildersUtilsImplementation,
    'getContentTypeArgs' | 'scalarAttributesToFiltersMap' | 'transformArgs'
  > & {
    /**
     * Nexus args by name, or `undefined` for a content type that is neither a component, a
     * collection type nor a single type (`services/builders/utils.ts:27-91`).
     */
    getContentTypeArgs(
      ...args: Parameters<BuildersUtilsImplementation['getContentTypeArgs']>
    ): Record<string, unknown> | undefined;
    /** Each attribute's scalar filter input type name (`services/builders/utils.ts:111-118`). */
    scalarAttributesToFiltersMap(
      ...args: Parameters<BuildersUtilsImplementation['scalarAttributesToFiltersMap']>
    ): Record<string, string>;
    /**
     * Reads `pagination`, `filters` and `sort` from the GraphQL args and returns a copy without
     * `pagination` and `filters`, with the mapped pagination and filters merged in
     * (`services/builders/utils.ts:133-168`).
     */
    transformArgs(
      args: Record<string, unknown>,
      options: Parameters<BuildersUtilsImplementation['transformArgs']>[1]
    ): Record<string, unknown>;
  };
};

type InternalsImplementation = ReturnType<typeof createInternals>;

/**
 * The registered `internals` service. `buildInternalTypes` returns Nexus definitions by name for
 * three kinds (`services/internals/types/index.ts:15-30`, `KINDS` in `services/constants.ts`).
 */
export type InternalsService = Omit<InternalsImplementation, 'buildInternalTypes'> & {
  buildInternalTypes(): {
    internal: Record<string, unknown>;
    enum: Record<string, unknown>;
    /** A scalar filters input definition per GraphQL scalar (`internals/types/filters.ts:9-39`). */
    'filters-input': { scalars: Record<string, unknown> };
  };
};

type UtilsImplementation = ReturnType<typeof createUtils>;
type AttributesImplementation = UtilsImplementation['attributes'];
type MappersImplementation = UtilsImplementation['mappers'];

/**
 * The registered `utils` service. The attribute checks and the mappers keep develop's published
 * types in the implementation; the contract writes them from the code.
 */
export type UtilsService = Omit<UtilsImplementation, 'attributes' | 'mappers'> & {
  attributes: Omit<
    AttributesImplementation,
    | 'isStrapiScalar'
    | 'isGraphQLScalar'
    | 'isMedia'
    | 'isRelation'
    | 'isEnumeration'
    | 'isComponent'
    | 'isDynamicZone'
  > & {
    /** `includes` on the `STRAPI_SCALARS` constant (`services/utils/attributes.ts:11-17`). */
    isStrapiScalar: (...args: Parameters<AttributesImplementation['isStrapiScalar']>) => boolean;
    /** `includes` on the `GRAPHQL_SCALARS` constant (`services/utils/attributes.ts:24-29`). */
    isGraphQLScalar: (...args: Parameters<AttributesImplementation['isGraphQLScalar']>) => boolean;
    /** The lodash `matchesProperty('type', …)` checks accept any value (`attributes.ts:45-73`). */
    isMedia: (value: unknown) => boolean;
    isRelation: (value: unknown) => boolean;
    isEnumeration: (value: unknown) => boolean;
    isComponent: (value: unknown) => boolean;
    isDynamicZone: (value: unknown) => boolean;
  };
  mappers: Omit<MappersImplementation, 'graphQLFiltersToStrapiQuery'> & {
    /**
     * Maps GraphQL filters, one object or a list, to a Strapi query; `null` and `undefined` map to
     * `{}` (`services/utils/mappers/graphql-filters-to-strapi-query.ts:46-119`).
     */
    graphQLFiltersToStrapiQuery(
      filters: unknown,
      contentType: Parameters<MappersImplementation['graphQLFiltersToStrapiQuery']>[1]
    ): unknown;
  };
};

/** GraphQL services by name, as registered by the plugin. */
export type Services = {
  builders: BuildersService;
  constants: ReturnType<typeof createConstants>;
  'content-api': ReturnType<typeof createContentAPI>;
  extension: ExtensionService;
  format: ReturnType<typeof createFormat>;
  internals: InternalsService;
  'type-registry': TypeRegistryService;
  utils: UtilsService;
};

/** Default contracts loaded with the GraphQL server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageConfigs {
        'plugin::graphql': GraphQLConfig;
      }

      interface PackageServices {
        'plugin::graphql.builders': Services['builders'];
        'plugin::graphql.constants': Services['constants'];
        'plugin::graphql.content-api': Services['content-api'];
        'plugin::graphql.extension': Services['extension'];
        'plugin::graphql.format': Services['format'];
        'plugin::graphql.internals': Services['internals'];
        'plugin::graphql.type-registry': Services['type-registry'];
        'plugin::graphql.utils': Services['utils'];
      }
    }
  }
}
