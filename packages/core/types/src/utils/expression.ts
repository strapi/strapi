import type { Array, Constants } from '.';

/**
 * The `IsNever` type checks if a given type {@link TValue} strictly equals to `never`.
 *
 * @template TValue - The type variable to be checked against `never`.
 *
 * @example
 * type A = IsNever<number>; // This will resolve to 'false' because number is not `never`
 * type B = IsNever<Cast<'foo', number>>; // This will resolve to 'true' because Cast<'foo', number> strictly equals to never.
 *
 * @see {@link StrictEqual} - The Type used internally to make the comparison.
 * @remark
 * Please make sure to understand the difference between `never` and other types in TypeScript before using `IsNever` for any conditional checks
 */
export type IsNever<TValue> = StrictEqual<TValue, never>;

/**
 * The `IsNotNever` type checks if a given type {@link TValue} does not strictly equals to `never`.
 *
 * It is useful in conditional types to verify if the variable of type {@link TValue} is something other than `never`.
 * It complements the {@link IsNever} type by negating the result using the {@link Not} utility type.
 *
 * @template TValue - The type variable to be checked for inequality against `never`.
 *
 * @example
 * type IsNotNeverNumber = IsNotNever<number>; // Evaluates to 'true' because number is not 'never'.
 * type IsNotNeverNever = IsNotNever<never>; // Evaluates to 'false' because `never` equals to 'never'.
 *
 * @see {@link IsNever} - The type used internally to check if {@link TValue} is `never`.
 */
export type IsNotNever<TValue> = Not<IsNever<TValue>>;

/**
 * The `IsTrue` type evaluates if the given {@link TValue} strictly equals {@link Constants.True}.
 *
 * @template TValue - The type to evaluate.
 *
 * @example
 * type A = IsTrue<true>; // This will resolve to Constants.True
 * type B = IsTrue<false>; // This will resolve to Constants.False
 */
export type IsTrue<TValue> = [TValue] extends [Constants.True] ? Constants.True : Constants.False;

/**
 * The `IsNotTrue` type evaluates if the given {@link TValue} is not strictly equal to {@link Constants.True}.
 *
 * It basically negates the output of {@link IsTrue}.
 *
 * @template TValue - The type to evaluate.
 *
 * @example
 * type A = IsNotTrue<true>; // This will resolve to Constants.False
 * type B = IsNotTrue<false>; // This will resolve to Constants.True
 *
 */
export type IsNotTrue<TValue> = Not<IsTrue<TValue>>;

/**
 * The `IsFalse` type evaluates if the given {@link TValue} strictly equals {@link Constants.False}.
 *
 * @template TValue - The type to evaluate.
 *
 * @example
 * type A = IsFalse<true>; // This will resolve to Constants.False
 * type B = IsFalse<false>; // This will resolve to Constants.True
 */
export type IsFalse<TValue> = [TValue] extends [Constants.False] ? Constants.True : Constants.False;

/**
 * The `IsNotFalse` type evaluates if the value provided does not strictly equal {@link Constants.False}.
 *
 * It basically negates the output of {@link IsFalse}.
 *
 * @template TValue - The type to be evaluated.
 *
 * @example
 * type A = IsNotFalse<false>; // This will resolve to Constants.False
 * type B = IsNotFalse<true>; // This will resolve to Constants.True
 */
export type IsNotFalse<TValue> = Not<IsFalse<TValue>>;

/**
 * The `StrictEqual` type evaluates if two types, {@link TValue} and {@link TMatch}, are strictly the same.
 *
 * In other words, it checks if {@link TValue} extends {@link TMatch} and if {@link TMatch} extends {@link TValue} at the same time,
 * hence ensuring complete type match.
 *
 * @template TValue - The first type to be compared.
 * @template TMatch - The second type to be compared.
 *
 * @returns Either {@link Constants.True} or {@link Constants.False}.
 *
 * @example
 * // With a regular extends
 * type A = "string" extends string ? true : false; // Result: true
 *
 * // With `StrictEqual`
 * type B = StrictEqual<"string", string>; // Result: false
 */
export type StrictEqual<TValue, TMatch> = And<Extends<TValue, TMatch>, Extends<TMatch, TValue>>;

/**
 * The `NotStrictEqual` type is a utility type that checks if two types, {@link TValue} and {@link TMatch}, are different using strict equality comparison.
 *
 *
 * @template TValue - The first type to be compared.
 * @template TMatch - The second type to be compared against the first one.
 *
 * @returns Either {@link Constants.True} or {@link Constants.False}
 *
 * @see {@link StrictEqual}
 *
 * @example
 * // Comparing basic types
 * type BasicTypeCheck = NotStrictEqual<number, string>; // Result: Constants.True (because `number` and `string` types are not the same)
 *
 * // Comparing complex types
 * type MyType = { a: number, b: string };
 * type OtherType = { a: number, c: boolean };
 * type ComplexTypeCheck = NotStrictEqual<MyType, OtherType>; // Result: Constants.True (because `MyType` and `OtherType` do not have the same structure)
 *
 */
export type NotStrictEqual<TValue, TMatch> = Not<StrictEqual<TValue, TMatch>>;

/**
 * The `Extends` type evaluates if a type, identified by {@link TLeft}, extends another one, identified by {@link TRight}.
 *
 * @template TLeft - The type to be tested if it extends {@link TRight}.
 * @template TRight - The base type used for comparison.
 *
 * @note To understand more about conditional types and the `extends` keyword in TypeScript see {@link https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types}
 *
 * @remark
 * The check `[TLeft] extends [TRight]` is wrapped in a tuple because TypeScript's `extends` behaves differently with unions in the context of distributivity.
 *
 * Wrapping in a tuple deactivates this distributive behavior and makes the check behave as expected in all cases.
 *
 * @example
 * The type `"hello"` is a subtype of `string` so it extends `string`
 * ```typescript
 * type isString = Extends<"hello", string>;
 * // output: Constants.True
 *```
 *
 * The type `string` does not extend `"hello"`.
 * ```typescript
 * type notSpecificString = Extends<string, "hello">;
 * // output: Constants.False
 * ```
 */
export type Extends<TLeft, TRight> = [TLeft] extends [TRight] ? Constants.True : Constants.False;

/**
 * The `DoesNotExtends` type checks if {@link TLeft} does not extend  {@link TRight}.
 *
 * @template TLeft - The type to be tested if it does not extend {@link TRight}.
 * @template TRight - The base type used for comparing if it is not extended by {@link TLeft}.
 *
 * @see {@link Extends}
 */
export type DoesNotExtends<TLeft, TRight> = Not<Extends<TLeft, TRight>>;

/**
 * The `Not` type defines a type-level boolean negation operation.
 *
 * More concretely, if {@link TExpression} strictly equates to {@link Constants.True} then the result of `Not<TExpression>` would be {@link Constants.False}, and vice versa.
 *
 * @template TExpression - The type level boolean expression to be negated. It should extend {@link Constants.BooleanValue}.
 *
 * @see {@link Constants.BooleanValue}
 *
 * @example
 * ```typescript
 * // Using expression that equates to `true`
 * type A = Not<Constants.True>; // Results in Constants.False
 *
 * // Using `true` wrapped inside another type
 * type B = Not<IsTrue<true>>; // Results in Constants.False
 *
 * // Using expression that equates to `false`
 * type C = Not<Constants.False>; // Results in Constants.True
 *
 * // Using `false` wrapped inside another type
 * type D = Not<IsFalse<false>>; // Results in Constants.True
 * ```
 */
export type Not<TExpression extends Constants.BooleanValue> = If<
  TExpression,
  Constants.False,
  Constants.True
>;

/**
 * The `If` type is a conditional type that accepts a type level boolean expression (`true` or `false` represented as {@link Constants.BooleanValue}),
 * and two result types, one if the expression is {@link Constants.True} and the other if it's {@link Constants.False}.
 *
 * It's an implementation of the traditional 'if/then/else' logic, but at the type level.
 *
 * @template TExpression - The type level boolean expression to evaluate. It should extend {@link Constants.BooleanValue}.
 * @template TOnTrue - The type returned if {@link TExpression} resolves to {@link Constants.True}.
 * @template TOnFalse - The type returned if {@link TExpression} resolves to {@link Constants.False}. It defaults to `never`.
 *
 * @example
 * Here's an example using `If` with {@link TExpression} that's resolved to {@link Constants.False}.
 *
 * As a result, the type applied will be 'FalseCase'.
 * ```typescript
 * type FalseCase = 'This is False';
 * type TrueCase = 'This is True';
 *
 * type Result = If<Constants.False, TrueCase, FalseCase>; // Result: 'This is False'
 * ```
 *
 * Conversely, if we replace {@link TExpression} with {@link Constants.True}, the applicable type will be 'TrueCase'.
 * ```typescript
 * type ExampleTrue = If<Constants.True, TrueCase, FalseCase>; // Result: 'This is True case'
 * ```
 *
 * If the third type argument is omitted, and the expression is false, the `If` type will resolve to `never`.
 * ```typescript
 * type ExampleNever = If<Constants.False, TrueCase>; // Result: never
 * ```
 */
export type If<TExpression extends Constants.BooleanValue, TOnTrue, TOnFalse = never> = [
  TExpression,
] extends [Constants.True]
  ? TOnTrue
  : TOnFalse;

/**
 * The `MatchFirst` type is a type-level logic that matches the first truthy `Test` in a given array of {@link Test} types
 * and resolves to corresponding type value ('TValue') of that {@link Test}.
 *
 * If no truthy {@link Test} is found, it resolves to a default type {@link TDefault}.
 *
 * @note This type is particularly useful for checking multiple conditions and matching the type to
 * whichever condition proves true first, similar to a switch-case or a series of if-else statements in traditional programming.
 *
 * @template TTests - An array of {@link Test} types that the type checker will iterate over to find the first truthy test.
 * @template TDefault - The default value that will be used if none of the {@link Test} types in {@link TTests} prove true. Defaults to `never`.
 *
 * @see {@link Test}
 * @see {@link MatchAllIntersect}
 *
 * @example
 * Here's an example showing how `MatchFirst` can be used with series of {@link Test} types.
 *
 * We have declared a Test array containing two Test types.
 * - The first Test type checks if 'T' is a string.
 *
 *   If true, it will return 'string type', else it moves to the next Test type.
 * - The next Test type checks if 'T' is a number.
 *
 *   If true, it will return 'number type'.
 * - The third argument is the default type which would be returned if all the conditions fail. In our case its 'unknown type'.
 *
 * ```typescript
 * type T = string; // you can replace 'T' with 'number' or 'boolean' to test.
 *
 * type IsString = Test<Extends<T, string>, 'string type'>;
 * type IsNumber = Test<Extends<T, number>, 'number type'>;
 * type Tests = [IsString, IsNumber];
 *
 * type Result = MatchFirst<Tests, 'unknown type'>; // Result would be 'string type' as 'T' is string.
 * ```
 *
 */
export type MatchFirst<TTests extends Test[], TDefault = never> = TTests extends [
  infer THead extends Test,
  ...infer TTail extends Test[],
]
  ? THead extends Test<infer TExpression, infer TValue>
    ? If<TExpression, TValue, If<Array.IsNotEmpty<TTail>, MatchFirst<TTail, TDefault>, TDefault>>
    : never
  : never;

/**
 * The `MatchAllIntersect` type enables the creation of an intersection type from a sequence of conditional types.
 *
 * It is useful in scenarios where the properties of an object are to be picked conditionally, based on evaluated boolean expressions.
 *
 * @template TTests - A tuple type where each member extends {@link Test}.
 *
 * It's this sequence of tests that determine the properties to be picked.
 *
 * @template TDefault - This type is used whenever a member of `TTests` doesn't match the expected type or when the
 * tuple is empty, meaning that no conditions were provided.
 *
 * This defaults to `unknown`.
 *
 * @see {@link Test}
 * @see {@link MatchFirst}
 *
 * @example
 * ```typescript
 * type Test1 = Test<Constants.True, { sort?: string }>;
 * type Test2 = Test<Constants.False, { fields?: number[] }>;
 * type Test3 = Test<Constants.True, { populate?: string[] }>;
 *
 * type Result = MatchAllIntersect<[Test1, Test2, Test3]>;
 * // The Result will be { sort?: string } & { populate?: string[] }
 * ```
 *
 * In the example above, only Test1 and Test3 resolves to true case and thus the result excludes the type `{ fields?: number[] }`.
 *
 * There is also a default case `{}` that would be returned if *all* the tests in `TTests` were false.
 *
 * This can be customized by using the second type parameter {@link TDefault}.
 * ```typescript
 * type Test3 = Test<Constants.False, { sort?: string }>;
 * type Test4 = Test<Constants.False, { fields?: number[] }>;
 *
 * type ResultDefault = MatchAllIntersect<[Test3, Test4], {}>; // The Result will be {}
 * ```
 */
export type MatchAllIntersect<TTests extends Test[], TDefault = unknown> = TTests extends [
  infer THead extends Test,
  ...infer TTail extends Test[],
]
  ? THead extends Test<infer TExpression, infer TValue>
    ? // Actual test case evaluation
      If<TExpression, TValue, TDefault> &
        // Recursion / End of recursion
        If<Array.IsNotEmpty<TTail>, MatchAllIntersect<TTail, TDefault>, TDefault>
    : TDefault
  : TDefault;

/**
 * The `Test` type pairs a boolean expression and a corresponding value.
 *
 * The elements of the type pair are:
 * 1. A boolean value ({@link TExpression}), which acts as the conditional expression.
 * 2. A corresponding value ({@link TValue}), which is usually returned/read when the conditional expression is `true`.
 *
 * @template TExpression - A boolean value that will be used as the conditional expression. It extends from {@link Constants.BooleanValue}.
 * @template TValue - The corresponding value that will be returned when the `TExpression` is `true`.
 *
 * @see {@link Constants.BooleanValue}
 * @see {@link MatchFirst}
 * @see {@link MatchAllIntersect}
 *
 * @example
 * Suppose we're writing a type level function that behaves differently based on whether the generic type parameter extends a string or a number.
 *
 * We can represent these two conditions using the `Test` type, like this:
 *
 * ```typescript
 * type T = number; // replace this with different types to see the outcome
 *
 * // Defining two Test conditions
 * type IsString = Test<Extends<T, string>, 'Input is a string'>;
 * type IsNumber = Test<Extends<T, number>, 'Input is a number'>;
 *
 * type DetectedType = MatchFirst<[IsString, IsNumber], 'unknown type'>; // The Result will be 'Input is a number'
 * ```
 */
export type Test<
  TExpression extends Constants.BooleanValue = Constants.BooleanValue,
  TValue = unknown,
> = [TExpression, TValue];

/**
 * The `Some` type is used for performing a boolean OR operation at the type level over all elements of {@link TExpressions}.
 *
 * The OR operation is applied between every two adjacent types in the array from left to right until a resulting type is derived.
 *
 * It's conceptually similar to the `Array.prototype.some()` method, but at the type level rather than the value level.
 *
 * If the array is empty, it returns {@link Constants.False}.
 *
 * @template TExpressions - An array of types extending {@link Constants.BooleanValue}. Use this to specify the types to apply the OR operation on.
 *
 * @see {@link Every}
 * @see {@link Constants.BooleanValue}
 *
 *
 * @example
 * ```typescript
 * type Example1 = Some<[Constants.False, Constants.False, Constants.False]>; // Result: Constants.False
 * type Example2 = Some<[Constants.False, Constants.True, Constants.False]>; // Result: Constants.True
 * type Example3 = Some<[Constants.True, Constants.True, Constants.True]>; // Result: Constants.True
 * type Example4 = Some<[Constants.False]>; // Result: Constants.False
 * type Example5 = Some<[Constants.True]>; // Result: Constants.True
 * type Example6 = Some<[]>; // Result: Constants.False
 * ```
 */
export type Some<TExpressions extends Constants.BooleanValue[]> = TExpressions extends [
  infer THead extends Constants.BooleanValue,
  ...infer TTail extends Constants.BooleanValue[],
]
  ? If<Array.IsNotEmpty<TTail>, Or<THead, Some<TTail>>, Or<THead, false>>
  : never;

/**
 * The `Every` type is used to perform a logical AND operation on a sequence of type-level boolean values represented as {@link Constants.BooleanValue}.
 *
 * The AND operation is applied between every two adjacent types in the array from left to right until a resulting type is derived.
 *
 * It's conceptually similar to the `Array.prototype.every()` method, but at the type level rather than the value level.
 *
 * If the array is empty, it returns {@link Constants.True}.
 *
 * @template TExpressions - An array of types extending {@link Constants.BooleanValue}. Use this to specify the types to apply the AND operation on.
 *
 * @example
 * ```typescript
 * type Example1 = Every<[Constants.False, Constants.False, Constants.False]>; // Result: Constants.False
 * type Example2 = Every<[Constants.False, Constants.True, Constants.False]>; // Result: Constants.False
 * type Example3 = Every<[Constants.True, Constants.True, Constants.True]>; // Result: Constants.True
 * type Example4 = Every<[Constants.False]>; // Result: Constants.False
 * type Example5 = Every<[Constants.True]>; // Result: Constants.True
 * type Example6 = Every<[]>; // Result: Constants.True
 * ```
 *
 * @see {@link Some}
 * @see {@link Constants.BooleanValue}
 */
export type Every<TExpressions extends Constants.BooleanValue[]> = TExpressions extends [
  infer THead extends Constants.BooleanValue,
  ...infer TTail extends Constants.BooleanValue[],
]
  ? If<Array.IsNotEmpty<TTail>, And<THead, Every<TTail>>, And<THead, Constants.True>>
  : never;

/**
 * The `And` type is a type-level logical conjugation (AND) operator.
 *
 * It calculates boolean AND operation of {@link IsTrue} derived from the input types {@link TLeft} and {@link TRight}.
 *
 * @template TLeft - The left hand operand of the AND operation. It should extend {@link Constants.BooleanValue}.
 * @template TRight - The right hand operand of the AND operation. It should extend {@link Constants.BooleanValue}.
 *
 * @see {@link IsTrue}
 *
 * @example
 * ```typescript
 * // Constants.True AND Constants.True
 * type Example1 = And<Constants.True, Constants.True>; // Result: Constants.True
 *
 * // Constants.False AND Constants.True
 * type Example2 = And<Constants.False, Constants.True>; // Result: Constants.False
 *
 * // Constants.False AND Constants.False
 * type Example3 = And<Constants.False, Constants.False>; // Result: Constants.False
 * ```
 */
export type And<
  TLeft extends Constants.BooleanValue,
  TRight extends Constants.BooleanValue,
> = IsTrue<IsTrue<TLeft> | IsTrue<TRight>>;

/**
 * The `Or` type is a type-level logical conjugation (OR) operator.
 *
 * It calculates boolean OR operation of {@link IsTrue} derived from the input types {@link TLeft} and {@link TRight}.
 *
 * @template TLeft - The left hand operand of the OR operation. It should extend {@link Constants.BooleanValue}.
 * @template TRight - The right hand operand of the OR operation. It should extend {@link Constants.BooleanValue}.
 *
 * @see {@link IsTrue}
 *
 * @example
 * ```typescript
 * // Constants.True OR Constants.True
 * type Example1 = Or<Constants.True, Constants.True>; // Result: Constants.True
 *
 * // Constants.False OR Constants.True
 * type Example2 = Or<Constants.False, Constants.True>; // Result: Constants.True
 *
 * // Constants.False OR Constants.False
 * type Example3 = Or<Constants.False, Constants.False>; // Result: Constants.False
 * ```
 */
export type Or<TLeft extends Constants.BooleanValue, TRight extends Constants.BooleanValue> = Not<
  IsFalse<IsTrue<TLeft> | IsTrue<TRight>>
>;

/**
 * The `Intersect` type constructs a new type by intersecting a list of types.
 *
 * @template TValues - The tuple of types to be intersected extending from `unknown[]`.
 *
 * @remark This type can easily be replaced by a regular intersection in most scenario.
 *
 * The main use-case would be when dealing with a list of types of unknown length.
 *
 * In the codebase, it's used mainly for aesthetics reasons (formatting of type params vs intersection members).
 *
 * @example
 * ```typescript
 * // Defining Attribute Options
 * interface ConfigurableOption {
 *   configurable?: boolean;
 * }
 *
 * interface RequiredOption {
 *   required?: boolean;
 * }
 *
 * // Intersecting Attribute Options
 * type AttributeOptions = Intersect<
 *   [ ConfigurableOption, RequiredOption ]
 * >
 *
 * // Now `AttributeOptions` contains properties from both `ConfigurableOption` and `RequiredOption`.
 * ```
 *
 * @example
 * ```typescript
 * // Using `Intersect` to define a complete Attribute type
 * interface BasicAttribute {
 *   name: string;
 *   type: string;
 * }
 *
 * interface AttributeProperties {
 *   minLength?: number;
 *   maxLength?: number;
 * }
 *
 * type Attribute = Intersect<[
 *   BasicAttribute,
 *   AttributeProperties,
 *   AttributeOptions
 * ]>
 *
 * // Now, `Attribute` type contains
 * // - name and type fields from `BasicAttribute`
 * // - minLength and maxLength fields from AttributeProperties
 * // - configurable and required fields from `AttributeOptions`
 * ```
 */
export type Intersect<TValues extends unknown[]> = TValues extends [
  infer THead,
  ...infer TTail extends unknown[],
]
  ? THead & If<Array.IsNotEmpty<TTail>, Intersect<TTail>, unknown>
  : never;
