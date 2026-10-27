/**
 * Edge case, kept on purpose to test type generation: a service assigned with `export =` rather
 * than `export default`. Strapi registers the assigned factory, and type generation registers the
 * type it returns, as for a default export. Write services with `export default`.
 */
const service = () => ({
  ping: () => 'pong' as const,
});

export = service;
