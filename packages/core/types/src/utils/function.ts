/**
 * Defines a function parameter in a way that accommodates any number and type of arguments.
 *
 * The flexibility the type provides makes it a suitable choice for representing generic function in TypeScript whose behaviors heavily rely on the runtime inputs.
 *
 * This type is primarily used when the function parameter types and return type can't be accurately defined.
 *
 * @remark
 * It's important to understand that while the {@link Any} type provides flexibility,
 * it inherently sacrifices the benefits of type-safety.
 *
 * Therefore, it's suggested to use it sparingly and only in situations where it's unavoidable.
 */
export type Any = (...args: any[]) => any;

/**
 * Async version of {@link Any}
 *
 * @see Any
 */
export type AnyPromise = (...args: any[]) => Promise<any>;
