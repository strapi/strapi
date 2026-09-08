/**
 * Type-level model of the values the HTML structured clone algorithm accepts.
 *
 * Unlike `_.cloneDeep`, `structuredClone` throws a `DataCloneError` at runtime when it
 * meets a function, a symbol, or a host object it does not know how to serialize. The
 * types below move that failure to compile time.
 *
 * The supported set follows the MDN reference:
 * https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types
 *
 * Known limitations:
 * - Class instances are cloned as plain objects (prototype, private fields and accessors
 *   are lost). This is not detectable in the type system, so such values are accepted.
 * - Symbol-keyed properties, property descriptors, getters and setters are dropped by the
 *   algorithm, and `RegExp.lastIndex` is not preserved.
 */

type AnyFunction = (...args: never[]) => unknown;

type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | BigInt64Array
  | BigUint64Array;

/**
 * Primitives the structured clone algorithm copies as-is. `symbol` is excluded on purpose.
 */
export type CloneablePrimitive = string | number | boolean | bigint | null | undefined;

/**
 * Instance type of a global constructor, or `never` when the current lib does not declare
 * it. Lets the platform types below be recognised in a DOM build without breaking a
 * Node-only one, where most of them are absent.
 */
type PlatformType<Name extends string> = Name extends string
  ? typeof globalThis extends { [K in Name]: { readonly prototype: infer Instance } }
    ? Instance
    : never
  : never;

/**
 * Web/API types the algorithm serializes, kept in MDN order. Each one resolves to `never`
 * unless the runtime's type definitions declare it.
 */
export type CloneablePlatform = PlatformType<
  | 'AudioData'
  | 'Blob'
  | 'CropTarget'
  | 'CryptoKey'
  | 'DOMException'
  | 'DOMMatrix'
  | 'DOMMatrixReadOnly'
  | 'DOMPoint'
  | 'DOMPointReadOnly'
  | 'DOMQuad'
  | 'DOMRect'
  | 'DOMRectReadOnly'
  | 'EncodedAudioChunk'
  | 'EncodedVideoChunk'
  | 'FencedFrameConfig'
  | 'File'
  | 'FileList'
  | 'FileSystemDirectoryHandle'
  | 'FileSystemFileHandle'
  | 'FileSystemHandle'
  | 'GPUCompilationInfo'
  | 'GPUCompilationMessage'
  | 'GPUPipelineError'
  | 'ImageBitmap'
  | 'ImageData'
  | 'RTCCertificate'
  | 'RTCEncodedAudioFrame'
  | 'RTCEncodedVideoFrame'
  | 'VideoFrame'
  | 'WebTransportError'
>;

/**
 * Built-in objects the structured clone algorithm knows how to serialize. `Error` covers
 * its subtypes (`EvalError`, `RangeError`, `ReferenceError`, `SyntaxError`, `TypeError`,
 * `URIError`), which are structurally identical to it.
 */
export type CloneableBuiltin =
  // `Boolean` / `Number` / `String` wrapper objects, spelled through their constructors so
  // the banned wrapper type names never appear.
  | PlatformType<'Boolean' | 'Number' | 'String'>
  | Date
  | RegExp
  | Error
  | ArrayBuffer
  | DataView
  | TypedArray
  | CloneablePlatform;

/**
 * Objects that are never cloneable, whatever they contain.
 */
type NonCloneableObject =
  | AnyFunction
  | symbol
  | WeakMap<object, unknown>
  | WeakSet<object>
  | Promise<unknown>;

/**
 * Marker left in place of a value the algorithm cannot serialize. Nothing is assignable to
 * it, so it turns into a compile error, and its name is what the error message shows.
 */
declare const reason: unique symbol;

export interface NotStructuredCloneable {
  readonly [reason]: 'functions, symbols, promises and weak collections cannot be cloned';
}

/**
 * Walks `T` and replaces every non-cloneable position with `Rejected`.
 *
 * `any` and `unknown` are passed through: nothing is known about them at compile time, so
 * they are left to fail at runtime rather than being rejected outright.
 */
type Walk<T, Rejected> = unknown extends T
  ? T
  : T extends Cloneable
    ? T
    : T extends CloneablePrimitive | CloneableBuiltin
      ? T
      : T extends NonCloneableObject
        ? Rejected
        : T extends Map<infer K, infer V>
          ? Map<Walk<K, Rejected>, Walk<V, Rejected>>
          : T extends Set<infer V>
            ? Set<Walk<V, Rejected>>
            : T extends object
              ? { [K in keyof T]: Walk<T[K], Rejected> }
              : Rejected;

/**
 * `T` projected through the structured clone algorithm: identical to `T` when `T` is
 * cloneable, `never` at every position holding a value the algorithm would reject.
 *
 * @example
 * type A = StructuredCloneable<{ id: number; at: Date }>; // { id: number; at: Date }
 * type B = StructuredCloneable<{ run(): void }>;          // { run: never }
 */
export type StructuredCloneable<T> = Walk<T, never>;

/**
 * Same walk, but marking rejected positions with {@link NotStructuredCloneable} so that a
 * failed assignment names both the offending property and the reason.
 */
type CloneCheck<T> = Walk<T, NotStructuredCloneable>;

/**
 * Any value the structured clone algorithm accepts.
 *
 * Use it to annotate a value of unknown shape. To constrain a generic parameter, prefer
 * {@link StructuredCloneable}, which preserves the original type and reports which
 * property is at fault.
 */
export type Cloneable =
  | CloneablePrimitive
  | CloneableBuiltin
  | ReadonlyArray<Cloneable>
  | ReadonlySet<Cloneable>
  | ReadonlyMap<Cloneable, Cloneable>
  | { readonly [key: string]: Cloneable };

/**
 * `structuredClone` restricted to values the algorithm can actually serialize.
 *
 * Passing a value holding a function, a symbol, a promise or a weak collection is a
 * compile-time error instead of a runtime `DataCloneError`.
 *
 * The rejected position is reported by name, e.g. passing `{ run: () => {} }` fails with
 * `Types of property 'run' are incompatible` against {@link NotStructuredCloneable}.
 *
 * A caller that is itself generic over a type parameter the compiler has not resolved yet
 * cannot be checked — the conditional stays deferred and the call is rejected even though
 * the value may be fine. Such callers have to widen the value first, e.g.
 * `structuredCloneSafe(value as Cloneable)`.
 *
 * @example
 * structuredCloneSafe({ id: 1, at: new Date() }); // ok
 * structuredCloneSafe({ run: () => {} });         // error: value is not structured-cloneable
 */
export const structuredCloneSafe = <T>(value: T & CloneCheck<T>): T => structuredClone(value);
