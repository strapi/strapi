/**
 * Extracts keys from a registry object based on a specified index type.
 *
 * @template TRegistry - The registry object.
 * @template TIndexType - The type of the index used to filter the keys.
 */
export type Keys<TRegistry extends object, TIndexType extends string> = Extract<
  keyof TRegistry,
  TIndexType
>;
