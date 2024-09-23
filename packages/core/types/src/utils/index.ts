export * as Constants from './constants';
export * as Array from './array';
export * as Guard from './guard';
export * as Object from './object';
export * as String from './string';
export * as Function from './function';
export * as Tuple from './tuple';

export * from './expression';
export * from './json';

/**
 * `Get<TValue, TKey>` obtains the type of a specific property (key-value pair) within an object or type.
 *
 * @template TValue The initial object type from which a property's type should be extracted.
 * @template TKey A specific key, existing within `TValue`.
 *
 * @example
 * // Utilizing Get to extract types from an object
 * type ExampleObject = { foo: 'bar', 'bar': 'foo' };
 *
 * // Extract `foo`'s type from the object. This infers and outputs the type 'bar'.
 * type FooType = Get<ExampleObject, 'foo'>;
 * let fooVar: FooType = 'bar'; // This is valid
 *
 * // Similar extraction for `bar`
 * type BarType = Get<ExampleObject, 'bar'>;
 * let barVar: BarType = 'foo'; // This is valid
 */
export type Get<TValue, TKey extends keyof TValue> = TValue[TKey];

/**
 * `Flatten intersection types.
 *
 * It acts upon each constituent type within the provided intersection, and extracts its properties
 * to form a new, unified object type where properties do not retain their original type-specific
 * distinctions.
 *
 * It’s useful when there's a need to treat an intersection type as a single unified object type,
 * while ensuring that the properties of each component type in the intersection are accounted for.
 *
 * @template T The type parameter indicating the intersection type that is to be simplified. This must extend `unknown`.
 *
 * @example
 * Consider the following example with two distinct types `A` and `B`:
 * ```typescript
 * type A = { a: number };
 * type B = { b: string };
 * ```
 * If we were to create an intersection of these two types as `C`:
 * ```typescript
 * type C = A & B;
 * ```
 * The usual operations on `C` would account for the distinct types `A` and `B`. However, when we want to treat it as a single unified object type, we can apply `Simplify` in the following way:
 * ```typescript
 * type D = Simplify<C>;
 * ```
 * Now, `D` is a single object type with properties from both `A` and `B`, and we can operate on it as:
 * ```typescript
 * let obj: D = { a: 5, b: 'hello' };
 * ```
 *
 * @remark
 * While this type is beneficial in certain contexts where treating intersection types as single unified objects is desirable (e.g. when exposing
 * complex types to end-users), it's important to remember that it strips the original type information from the properties.
 *
 * Thus, it may not be suitable in situations where retaining the distinction between types present in the intersection is important.
 */
export type Simplify<T> = { [TKey in keyof T]: T[TKey] };

/**
 * Utility type that creates a new type by excluding properties from the left type ({@link TLeft}) that exist in the right type ({@link TRight}).
 *
 * @template TLeft
 * @template TRight
 *
 * @example
 * type User = {
 *   id: number,
 *   name: string,
 *   email: string,
 * };
 *
 * type Credentials = {
 *   email: string,
 *   password: string,
 * };
 *
 * type UserWithoutCredentials = Without<User, Credentials>;
 *
 * const user: UserWithoutCredentials = {
 *     id: 1,
 *     name: 'Alice'
 *     // no email property because it's excluded by the Without type
 * };
 */
export type Without<TLeft, TRight> = { [key in Exclude<keyof TLeft, keyof TRight>]?: never };

/**
 * Creates a type that is mutually exclusive between two given types.
 *
 * @template TLeft - The first type.
 * @template TRight - The second type.
 *
 * @remarks
 * This type is used to create a type that can be either TLeft or TRight, but not both at the same time.
 *
 * @example
 * // Example 1: XOR type with two object types
 * type A = { a: number };
 * type B = { b: string };
 *
 * const value1: XOR<A, B> = { a: 1 }; // Valid, TLeft type A is assigned
 * const value2: XOR<A, B> = { b: "hello" }; // Valid, TRight type B is assigned
 * const value3: XOR<A, B> = { a: 1, b: "hello" }; // Invalid, both types A and B cannot be assigned at the same time
 *
 * // Example 2: XOR type with object type and string type
 * type C = XOR<A, string>;
 *
 * const value4: C = { a: 1 }; // Valid, object type A is assigned
 * const value5: C = "hello"; // Valid, string type is assigned
 * const value6: C = { a: 1, b: "hello" }; // Invalid, both object type A and string type cannot be assigned at the same time
 */
export type XOR<TLeft, TRight> = TLeft | TRight extends object
  ? (Without<TLeft, TRight> & TRight) | (Without<TRight, TLeft> & TLeft)
  : TLeft | TRight;

/**
 * The `Cast` type is designed for casting a value of type {@link TValue} into type {@link TType}, thus making sure {@link TValue} extends {@link TType}.
 *
 * If the casting is impossible ({@link TValue} does not extend {@link TType}), it returns `never`.
 *
 * @template TValue - The type to cast.
 * @template TType - The target type.
 *
 * @example
 * // In this example, the String 'Hello' is attempted to be cast to a number,
 * // which is not possible. Thus, the result would be 'never'.
 * type ImpossibleCasting = Cast<'Hello', number>; // this will be 'never'
 *
 * @example
 * // In this example, the String 'Hello' is attempted to be cast to a String,
 * // which is possible. Thus, the result would be 'Hello'.
 * type PossibleCasting = Cast<'Hello', string>; // this will be 'Hello'
 *
 */
export type Cast<TValue, TType> = TValue extends TType ? TValue : never;

/**
 * The `PartialWithThis<T>` type extends the functionality of two types: {@link Partial} and {@link ThisType}.
 *
 * It creates a type that represents an object with a subset of properties from the provided
 * type {@link T} merged with a pseudo `this` context for methods, based on the same type parameter.
 *
 * - {@link Partial} makes all properties of the given type optional.
 * - {@link ThisType} defines what `this` refers to within a method of the final object.
 *
 * @template T The type to create a subset from and to use for the pseudo 'this' context.
 *
 * It can be any TypeScript type such as interface, class, primitive, or even another
 * generic type.
 *
 * @example
 * ```typescript
 * interface MyObject {
 *     property1: string;
 *     property2: number;
 *     method(): void;
 * }
 *
 * let foo: PartialWithThis<MyObject> = {
 *     property1: 'Hello',
 *     method() {
 *       // Here, `this` refers to `MyObject`
 *       console.log(this.property1);
 *     },
 *     // `property2` is optional
 * };
 * ```
 *
 * @remark
 * This type can be useful when working with partial data and object methods that contain a pseudo `this` context.
 */
export type PartialWithThis<T> = Partial<T> & ThisType<T>;

/**
 * Enforce mutually exclusive properties.
 *
 * The `OneOf<T, U>` type ensures that either properties of type {@link T} or properties of type {@link U} are present,
 * but never both at the same time. It is useful for defining states where you want to
 * have exactly one of two possible sets of properties.
 *
 * @template T - The first set of properties.
 * @template U - The second set of properties.
 *
 * @example
 * // Define a type where you either have data or an error, but not both:
 * type Response = OneOf<
 *   { data: Data },
 *   { error: ApplicationError | ValidationError }
 * >;
 *
 * // Is equivalent to:
 * type Response = { data: Data, error: never } | { data: never, error: ApplicationError | ValidationError };
 *
 */
export type OneOf<T, U> = (T & { [K in keyof U]?: never }) | (U & { [K in keyof T]?: never });
