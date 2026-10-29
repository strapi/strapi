import type { AppComponent } from './types';

const KEBAB_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * Validate the shape + identity of a programmatic component and return it
 * untouched-but-typed. Pure: no side effects beyond validation.
 *
 * The `uid` must be `<category>.<name>` with both segments kebab-case — there is
 * no derivation from a directory + filename in programmatic mode (ADR-0004).
 * Deeper schema normalization (collectionName / globalId defaults, the registry
 * shape) happens later in `normalizeComponent`.
 *
 * @example
 * ```ts
 * import { defineComponent } from '@strapi/strapi';
 * import * as is from '@strapi/strapi/attributes';
 *
 * const dish = defineComponent({
 *   uid: 'default.dish',
 *   displayName: 'Dish',
 *   attributes: { name: is.string({ required: true }), price: is.decimal() },
 * });
 * ```
 */
export const defineComponent = (component: AppComponent): AppComponent => {
  if (!isPlainObject(component)) {
    throw new TypeError('defineComponent(component) requires a component object');
  }

  const { uid, displayName, attributes } = component;

  if (typeof uid !== 'string' || uid.length === 0) {
    throw new Error('A programmatic component requires a `uid` ("<category>.<name>")');
  }

  const segments = uid.split('.');
  if (segments.length !== 2) {
    throw new Error(
      `Programmatic component "${uid}": \`uid\` must be "<category>.<name>" (got "${uid}")`
    );
  }

  const [category, name] = segments;
  if (!KEBAB_SEGMENT.test(category) || !KEBAB_SEGMENT.test(name)) {
    throw new Error(
      `Programmatic component "${uid}": both the category and name in \`uid\` must be kebab-case (got "${uid}")`
    );
  }

  if (!displayName) {
    throw new Error(`Programmatic component "${uid}" requires a \`displayName\``);
  }

  if (!isPlainObject(attributes)) {
    throw new Error(`Programmatic component "${uid}" requires an \`attributes\` object`);
  }

  return component;
};
