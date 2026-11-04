import type { Logger as WinstonLogger } from 'winston';

/**
 * The logger behind `strapi.log`.
 *
 * @internal Not a public API yet.
 */
export type Logger = WinstonLogger;
