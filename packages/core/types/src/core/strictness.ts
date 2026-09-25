/** Whether this TypeScript program has opted into registered contracts. */
export type IsStrict = Strapi.Registries.Settings extends { strict: true } ? true : false;

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
