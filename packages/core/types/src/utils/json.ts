/**
 * The `JSONValue` type embodies all potential JSON data forms ({@link JSONPrimitive}, {@link JSONObject}, and {@link JSONArray}).
 *
 * @note `JSONValue` does not introduce any new type parameters; it merely aggregates {@link JSONPrimitive}, {@link JSONObject}, and {@link JSONArray}.
 *
 * @example
 * ```typescript
 * function processJSON(jsonData: JSONValue): void {
 *   if (Array.isArray(jsonData)) {
 *     console.log('This is a JSONArray: ', JSON.stringify(jsonData, null, 2));
 *   } else if (typeof jsonData === 'object') {
 *     console.log('This is a JSONObject: ', JSON.stringify(jsonData, null, 2));
 *   } else {
 *     console.log('This is a JSONPrimitive: ', jsonData);
 *   }
 * }
 *
 * processJSON(['hello', { anotherKey: 'anotherValue' }]);
 * // This is a JSONArray: ["hello", { "anotherKey": "anotherValue" }]
 *
 * processJSON({ key: 'value' });
 * // This is a JSONObject: { "key": "value" }
 *
 * processJSON(10);
 * // This is a JSONPrimitive: 10
 * ```
 *
 * @see {@link JSONPrimitive} - The simplest form of `JSONValue`, corresponds to basic JSON data types.
 * @see {@link JSONObject} - A potential `JSONValue`, encapsulates JSON object structures.
 * @see {@link JSONArray} - A potential `JSONValue`, encapsulates JSON arrays.
 */
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

/**
 * The `JSONPrimitive` type models the fundamental data types (`string`, `number`, `boolean`, `null`) of JSON in TypeScript.
 *
 * @example
 * ```typescript
 * declare function set(key: string, value: JSONPrimitive): void;
 *
 * set('string', 'foo'); // This is valid
 * set('number', 42); // This is valid
 * set('boolean', true); // This is valid
 * set('null', null); // This is valid
 * set('array', []); // Error
 * set('undefined', undefined); // Error
 * ```
 *
 * @see {@link JSONValue} - The potential forms of JSON data, including `JSONPrimitive`.
 * @see {@link JSONObject} - Incorporated in {@link JSONValue}, represents JSON objects.
 * @see {@link JSONArray} - Incorporated in {@link JSONValue}, represents JSON arrays.
 *
 * @remarks
 * `JSONPrimitive` provides a foundation for describing JSON data.
 * Combined with {@link JSONObject} and {@link JSONArray}, they encompass all possible JSON data types.
 */
export type JSONPrimitive = string | number | boolean | null;

/**
 * The `JSONArray` type models a standard JSON array in TypeScript, which allows manipulation of arrays of {@link JSONValue} elements.
 *
 * @example
 * ```typescript
 * // Create a JSONArray consisting of different JSONValues
 * let jsonArray: JSONArray = ['hello', 10, true, null, {key: 'value'}, ['nested array']];
 *
 * function prettyPrint(jsonArray: JSONArray): void {
 *  jsonArray.forEach(item => {
 *    if(typeof item === 'object' && item !== null) {
 *      // If it's a JSONObject or another JSONArray, stringify it
 *      console.log(JSON.stringify(item, null, 2));
 *    } else {
 *      // If it's a JSONPrimitive, print it directly
 *      console.log(item);
 *    }
 *  });
 * }
 *
 * prettyPrint(jsonArray); // Will print all items in a friendly format to the console
 * ```
 *
 * This type is part of a series of types used for modeling all possible JSON values in TypeScript.
 * @see {@link JSONValue} - The supertype of all elements that a `JSONArray` can contain.
 * @see {@link JSONPrimitive} - The simplest kind of `JSONValue` that a `JSONArray` can contain.
 * @see {@link JSONObject} - A possible `JSONValue` that a `JSONArray` can contain.
 *
 * @remarks
 * The `JSONArray` is a versatile type that can contain various kinds of JSON data, even nested arrays or objects.
 */
export type JSONArray = Array<JSONValue>;

/**
 * The `JSONObject` interface formally defines a JavaScript object with string keys and values of type {@link JSONValue}.
 *
 * It models standard JSON objects as TypeScript types, facilitating their manipulation.
 *
 * @example
 * ```typescript
 * function addToJSONObject(key: string, value: JSONValue, jsonObject: JSONObject): JSONObject {
 *   // Copy the existing JSONObject
 *   let updatedObject: JSONObject = { ...jsonObject };
 *
 *   // Add the new key-value pair
 *   updatedObject[key] = value;
 *
 *   // Return the updated JSONObject
 *   return updatedObject;
 * }
 * ```
 *
 * @see {@link JSONValue} - The permitted types for values within the `JSONObject` (primitives, objects, or arrays).
 * @see {@link JSONPrimitive} - The basis for JSON data, used in {@link JSONValue}.
 * @see {@link JSONArray} - Arrays used in {@link JSONValue}.
 *
 * @remarks
 * The keys of the `JSONObject` are always of type string, as per the standard JSON specification.
 * Values may take any valid {@link JSONValue}, allowing nested data structures.
 */
export interface JSONObject {
  [key: string]: JSONValue;
}
