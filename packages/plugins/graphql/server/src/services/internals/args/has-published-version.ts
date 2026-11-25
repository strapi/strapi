import { booleanArg } from 'nexus';

/**
 * @deprecated Use `publicationFilter` (`NEVER_PUBLISHED` / `HAS_PUBLISHED_VERSION`, etc.) instead.
 * Kept for GraphQL backward compatibility with existing clients.
 */
export default () => booleanArg();
