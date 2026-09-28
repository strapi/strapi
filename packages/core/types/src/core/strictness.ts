/** Whether this TypeScript program has opted into registered contracts. */
export type IsStrict = Strapi.Registries.Settings extends { strict: true } ? true : false;

/**
 * A lookup result type argument that the call's contextual type cannot infer in strict mode, so
 * `const s: MyService = strapi.service(uid)` does not replace `strapi.service<MyService>(uid)`.
 * Without strict mode, it is `T` and annotations keep inferring it, as before registries.
 */
export type StrictNoInfer<T> = IsStrict extends false ? T : NoInfer<T>;

/**
 * Whether `TName` is a wide or dynamic name, such as `string` or `` `plugin::${string}.x` ``, that a
 * registry cannot validate. Literal names, and unions of them, resolve to `false`.
 */
export type IsDynamicName<TName extends string> =
  Record<never, never> extends Record<TName, unknown> ? true : false;

/**
 * A record whose registered keys resolve to `TEntries`, and any other key to `TFallback`.
 * An index signature cannot tell a literal key from a dynamic one, so unregistered keys stay open.
 */
export type RegisteredRecord<TEntries, TFallback> = [keyof TEntries] extends [never]
  ? Record<string, TFallback>
  : TEntries & Record<string, TFallback>;
