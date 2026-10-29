/**
 * Edge case, kept on purpose to test type generation: a `.ts` service written CommonJS-style, with
 * `module.exports` and no `import` or `export`. Strapi loads it, but TypeScript does not type
 * `module.exports` in a `.ts` file, and importing this file would fail with TS2306 ("is not a
 * module") and stop the compilation. Type generation registers `api::legacy.commonjs-style` as
 * `unknown`, without importing it. Write services with `export default`.
 */
module.exports = () => ({
  ping: () => 'pong',
});
