/**
 * Extracts object's (`TValue`) keys where the key's value type extends the given `TTest` type.
 *
 * @template TValue - The original object type.
 * @template TTest - The test type. Keys of TValue having values that extend this type are extracted.
 * @template TExtract - An optional constraint for the keys of TValue.
 *
 * @example
 *
 *   // Here TValue is `{ foo: 'bar', bar: 'foo', foobar: 2 }` and TTest is `string`.
 *   // So it extracts keys `foo` and `bar`, because their values are string type.
 *   type keys = KeysBy<{ foo: 'bar', bar: 'foo', foobar: 2 }, string> // 'foo' | 'bar'
 *
 * @example
 *
 *   // Here TValue is `{ foo: { x: 'foo' }, bar: { x: 'bar' }, other: { x: '42' } }` and TTest is `{ x: 'foo' | 'bar' }`.
 *   // So it extracts keys `foo` and `bar`, because their values are extending `{ x: 'foo' | 'bar' }`.
 *   type Base = { x: 'foo' | 'bar' };
 *   type Obj = { foo: { x: 'foo' }, bar: { x: 'bar' }, other: { x: '42' } };
 *   type X = KeysBy<Obj, Base> // 'foo' | 'bar'
 *
 * @see {@link KeysExcept}
 * @see {@link PickBy}
 */
export type KeysBy<TValue, TTest, TExtract extends keyof any = keyof any> = {
  [key in keyof TValue & TExtract]: TValue[key] extends TTest ? key : never;
}[keyof TValue & TExtract];

/**
 * Extracts the keys of a given object ({@link TValue}). It includes only those keys which do not map to a value of type {@link TTest}`.
 *
 * @template TValue - The object whose keys are to be examined and selectively retrieved
 * @template TTest - The type of value to be used as an exclusion criterion for selecting keys from `TValue`
 * @template TExtract - An optional union of keys to constrain the keys that are being examined. If not provided, it defaults to examining all keys in `TValue`.
 *
 * @example
 * ```typescript
 * // In this example, KeysExcept is used to fetch keys from the object which do not have string type values
 * type ExampleType = { foo: 'bar', bar: 'foo', foobar: 2 }
 * type ResultType = KeysExcept<ExampleType, string>
 * // The resulting type is "foobar"
 * ```
 *
 * @example
 * ```typescript
 * // In this example, we use a base type to define allowed value types and only fetch those keys from the object that have values not extending the base type
 * type Base = { x: 'foo' | 'bar' };
 * type Obj = { foo: { x: 'foo' }, bar: { x: 'bar' }, other: { x: '42' } };
 * type X = KeysBy<Obj, Base>
 * // The resulting type is "other"
 * ```
 */
export type KeysExcept<TValue, TTest, TExtract extends keyof any = keyof any> = {
  [key in keyof TValue & TExtract]: TValue[key] extends TTest ? never : key;
}[keyof TValue & TExtract];

/**
 * Select properties from an object ({@link TValue}), only if their types extend a specific test type ({@link TTest}).
 *
 * @template TValue - The object type from which properties are selected.
 * @template TTest - The test type. Properties of TValue extending this type are selected.
 *
 * @example
 *
 *  // If we have this:
 *  type FruitAttributes = { color: string, taste: string, weight: number, isOrganic: boolean };
 *
 *  // And we use `PickBy` like so:
 *  type StringAttributes = PickBy<FruitAttributes, string>;
 *
 *  // Then, `StringAttributes` will equal: `{ color: string, taste: string }`
 */
export type PickBy<TValue, TTest> = Pick<TValue, KeysBy<TValue, TTest>>;

/**
 * Creates a new type from a given type ({@link TValue}), and select specific
 * keys ({@link TKeys}) to be optionally present in the new type.
 *
 * @template TValue The original type of object.
 * @template TKeys A union of selected {@link TValue} object keys that should be partial/optional in the new type.
 *
 * @example
 * ```typescript
 * type Person = {
 *   name: string;
 *   age: number;
 * };
 *
 * type PartialAgePerson = PartialBy<Person, 'age'>;
 *
 * // the type PartialAgePerson is now equivalent to:
 * // {
 * //   name: string;
 * //   age?: number;
 * // }
 * ```
 */
export type PartialBy<TValue, TKeys extends keyof TValue> = Omit<TValue, TKeys> &
  Partial<Pick<TValue, TKeys>>;

/**
 * Extracts all unique values from a given object as a union type.
 *
 * @template TObject - An object from which values are to be extracted. It must extend the `object` type.
 *
 * @remark
 * It works with non-primitive values as well. Hence, if a value is an object, it is included as is. Primitive types are included directly.
 *
 * @example
 * With a simple object:
 * ```TypeScript
 * type SimpleExample = Values<{
 *     a: 'one',
 *     b: 'two',
 *     c: 3
 * }>;
 * // Result: 'one' | 'two' | 3
 * ```
 *
 * @example
 * With complex (non-primitive) values in an object:
 * ```TypeScript
 * type ComplexExample = Values<{
 *     a: { x: 10 },
 *     b: { y: 'twenty' },
 *     c: { z: true }
 * }>;
 * // Result: { x: 10 } | { y: 'twenty' } | { z: true }
 * ```
 */
export type Values<TObject extends object> = TObject[keyof TObject];

/**
 * Provides a way to set deeply-nested properties within `TObject` to optional.
 *
 * @template TObject Type of the object that will become deeply partial.
 *
 * @example
 * ```typescript
 * interface Person {
 *   name: string;
 *   age: number;
 *   address: {
 *     city: string;
 *     street: string;
 *     postalCode: number;
 *   };
 * }
 *
 * const partialPerson: DeepPartial<Person> = {}; // This is now valid
 *
 * // You can assign partially filled objects
 * const anotherPerson: DeepPartial<Person> = {
 *   name: 'John',
 *   address: {
 *     city: 'San Francisco',
 *     // street and postal code are optional
 *   }
 * }
 * ```
 */
export type DeepPartial<TObject> = TObject extends object
  ? {
      [TKey in keyof TObject]?: DeepPartial<TObject[TKey]>;
    }
  : TObject;

/**
 * Creates a new type by replacing properties of {@link TObject} with properties from {@link TNew}.
 *
 * This is particularly useful to fine-tune the shape of an object type by altering some of its properties while keeping the rest intact.
 *
 * @template TObject - A type that extends `object`. This should be the original type that you intend to transform.
 * @template TNew - A partial type of {@link TObject} where keys are replaced with new types.
 *
 * @example
 *
 * ```typescript
 * type Original = { foo: number, bar: number}; // Declare original type
 * type Transformation = { foo: string }; // Declare keys to replace from original type
 *
 * type Result = Replace<Original, Transformation>;
 * // The transformed type now becomes { foo: string, bar: number }
 * ```
 */
export type Replace<
  TObject extends object,
  TNew extends Partial<{ [key in keyof TObject]: unknown }>,
> = Omit<TObject, keyof TNew> & TNew;
