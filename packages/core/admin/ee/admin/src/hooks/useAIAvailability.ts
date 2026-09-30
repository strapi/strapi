/**
 * The server enables `ai` only with the `cms-ai` license feature, and features exist only with
 * a valid license, so no edition check is needed here.
 */
export const useAIAvailability = (): boolean => window.strapi?.ai?.enabled === true;
