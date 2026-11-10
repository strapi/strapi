/**
 * Edge case, kept on purpose to test type generation: a JS middleware whose config is typed with
 * JSDoc. `allowJs` (tsconfig.json) compiles it into `dist`, which registers
 * `global::response-header`, and type generation reads its config from the JSDoc of the factory:
 * `{ name: string; value: string }`. Without `allowJs` or a sibling `response-header.d.ts`, the
 * middleware would register `unknown`.
 *
 * @param {{ name: string; value: string }} config
 */
module.exports = (config) => async (ctx, next) => {
  ctx.set(config.name, config.value);
  await next();
};
