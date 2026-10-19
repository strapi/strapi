type SetParams = {
  key: string;
  value: unknown;
  type?: string;
  environment?: string;
  name?: string;
  tag?: string;
};

type GetParams = {
  key: string;
  type?: string;
  environment?: string;
  name?: string;
  tag?: string;
};

type Params = SetParams & GetParams;

export interface CoreStore {
  (defaultParams: Partial<Params>): {
    get(params?: Partial<GetParams>): Promise<unknown>;
    set(params?: Partial<SetParams>): Promise<void>;
    delete(params?: Partial<GetParams>): Promise<void>;
  };
  get(params: GetParams): Promise<unknown>;
  set(params: SetParams): Promise<void>;
  delete(params: GetParams): Promise<void>;
}

/** The `name` segment of a storage key: `_<name>`, or nothing when the name is missing or empty. */
type NameSegment<TName> = TName extends undefined | ''
  ? ''
  : TName extends string
    ? `_${TName}`
    : never;

/**
 * The storage key of a core store row, built from its params as the runtime builds it:
 * `<type>_<name>_<key>`, or `<type>_<key>` without a name (`core-store.ts` in `@strapi/core`).
 * `TDefaultType` is the type used when the params have none: `get` reads `'core'` rows, but `set`
 * and `delete` do not default it and use the row `'undefined_<…>'`.
 * `environment` and `tag` are not part of the key: rows that differ only by them share a contract.
 */
export type StorageKey<TParams, TDefaultType extends string> = TParams extends {
  key: infer TKey extends string;
}
  ? `${TParams extends { type: infer TType extends string } ? TType : TDefaultType}${NameSegment<
      TParams extends { name: infer TName } ? TName : undefined
    >}_${TKey}`
  : never;

/** Storage keys that have a registered value, including template-literal keys built at runtime. */
export type RegisteredStoreKey = keyof Strapi.Registries.Stores;

/**
 * The registered value of a storage key. A key that is not registered, or that a registry cannot
 * check because it is wide (`string`), resolves to `unknown`, as before the registry existed.
 */
export type StoreValue<TKey extends string> = [TKey] extends [never]
  ? unknown
  : [TKey] extends [RegisteredStoreKey]
    ? Strapi.Registries.Stores[TKey & RegisteredStoreKey]
    : unknown;

/**
 * What a read of `TKey` resolves to. A registered value or `null`: the runtime returns `null` when no
 * row matches, or when the stored value is not JSON (`core-store.ts`). Unregistered keys stay `unknown`.
 */
export type StoreRead<TKey extends string> =
  unknown extends StoreValue<TKey> ? unknown : StoreValue<TKey> | null;

/**
 * The value a write of `TKey` takes: its registered value, or `TUnregistered`, the value param the
 * call has without strict types.
 */
type StoreWrite<TKey extends string, TUnregistered> =
  unknown extends StoreValue<TKey> ? TUnregistered : { value: StoreValue<TKey> };

/** Params of a core store row. */
type StoreParams = Omit<Params, 'value'>;

/** Bound params overridden by call params, as the runtime spreads them (`{ ...bound, ...params }`). */
type MergeParams<TBound, TParams> = Omit<TBound, keyof TParams> & TParams;

/**
 * A core store bound to some params, `strapi.store(params)`, with strict types enabled. Each call
 * spreads its own params over the bound ones.
 */
export interface StrictBoundCoreStore<TBound> {
  /** Reads the row of the merged params: its registered value, or `null` when it has none. */
  get<const TParams extends Partial<StoreParams> = Record<never, never>>(
    params?: TParams
  ): Promise<StoreRead<StorageKey<MergeParams<TBound, TParams>, 'core'>>>;
  /**
   * Replaces the whole value of the row of the merged params. A registered key takes its registered
   * value: a partial value would replace the stored one, and the owner keeps reading the row with its
   * own contract.
   */
  set<const TParams extends Partial<StoreParams> & { value?: unknown }>(
    params: TParams &
      StoreWrite<StorageKey<MergeParams<TBound, TParams>, 'undefined'>, { value?: unknown }>
  ): Promise<void>;
  delete(params?: Partial<StoreParams>): Promise<void>;
}

/**
 * The core store, `strapi.store`, with strict types enabled.
 *
 * Values are read through the {@link Strapi.Registries.Stores} registry, keyed by the storage key
 * that the params build. The runtime stores values as JSON, so a registered value is the JSON shape
 * the owner writes. A read resolves to that value or `null`. Writes of a registered key take its
 * value. Unregistered keys keep the types they have without strict types.
 *
 * A registered value describes the rows its owner writes. Other code can still write the same row
 * (another plugin, an import, a raw query), so a read type stays an assertion about stored data.
 */
export interface StrictCoreStore {
  /** Binds `defaultParams`: every call of the bound store spreads its own params over them. */
  <const TBound extends Partial<StoreParams>>(defaultParams: TBound): StrictBoundCoreStore<TBound>;
  /** Reads the row of `params`, `'core'` when they have no type: its registered value, or `null`. */
  get<const TParams extends StoreParams>(
    params: TParams
  ): Promise<StoreRead<StorageKey<TParams, 'core'>>>;
  /**
   * Replaces the whole value of the row of `params`. A registered key takes its registered value.
   * Without a type, the runtime writes the row `'undefined_<…>'`, which no registered key matches.
   */
  set<const TParams extends StoreParams & { value?: unknown }>(
    params: TParams & StoreWrite<StorageKey<TParams, 'undefined'>, { value: unknown }>
  ): Promise<void>;
  delete(params: StoreParams): Promise<void>;
}
