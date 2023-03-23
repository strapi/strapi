/**
 * @typedef Attribute
 * @type { { type: string; repeatable: boolean }}
 *
 * @typedef Attributes
 * @type {{ [key: string]: Attribute }}
 *
 * @typedef ReplacementFn
 * @type {<TData extends object, TKey extends string>(data: TData[TKey], { path: string[]; parent: TData }) => any}
 */

/**
 * This function will recursively find everything and replace it with a value
 * based on the boolean return of the predicate function e.g. `type === 'relation'`.
 *
 * If you provide a function it will call that function with data value you're replacing with
 * a second argument with the path to the value and it's parent.
 *
 * It's original use was for the preperation of action items for the INIT_FORM action. It requires
 * knowledge of the `components` in the entity, however `components` doesn't change nor does the predicate
 * function so we don't need to pass it everytime hence why it's curried.
 *
 * @type {<TData extends object = object>(data: { [key: string]: { attributes: Attributes } }, predicate?: (value: Attribute, { path: string[]; parent: TData }) => boolean, replacement?: ReplacementFn<TData, keyof TKey> | any) => (data: TData, attributes: Attributes) => TData}
 */
const findAllAndReplaceSetup = (components, predicate = () => false, replacement = undefined) => {
  /**
   * @type {<TData extends object = object>(data: TData, attributes: Attributes, options?: { ignoreFalseyValues?: boolean}) => TData}
   */
  const findAllAndReplace = (
    data,
    attributes,
    { ignoreFalseyValues = false, path = [], parent = attributes } = {}
  ) => {
    return Object.entries(attributes).reduce(
      (acc, [key, value]) => {
        if (
          ignoreFalseyValues &&
          (acc === null || acc === undefined || acc[key] === undefined || acc[key] === null)
        ) {
          return acc;
        }

        if (predicate(value, { path: [...path, key], parent })) {
          acc[key] =
            typeof replacement === 'function'
              ? replacement(acc[key], { path: [...path, key], parent: acc })
              : replacement;
        }

        if (value.type === 'component') {
          const componentAttributes = components[value.component].attributes;

          if (!value.repeatable && acc[key] && typeof acc[key] === 'object') {
            acc[key] = findAllAndReplace(acc[key], componentAttributes, {
              ignoreFalseyValues,
              path: [...path, key],
              parent: attributes[key],
            });
          } else if (value.repeatable && Array.isArray(acc[key])) {
            acc[key] = acc[key].map((datum, index) => {
              const data = findAllAndReplace(datum, componentAttributes, {
                ignoreFalseyValues,
                path: [...path, key, index],
                parent: attributes[key],
              });

              return data;
            });
          }
        } else if (value.type === 'dynamiczone' && Array.isArray(acc[key])) {
          acc[key] = acc[key].map((datum, index) => {
            const componentAttributes = components[datum.__component].attributes;
            const data = findAllAndReplace(datum, componentAttributes, {
              ignoreFalseyValues,
              path: [...path, key, index],
              parent: attributes[key],
            });

            return data;
          });
        }

        return acc;
      },
      { ...data }
    );
  };

  return findAllAndReplace;
};

export { findAllAndReplaceSetup as findAllAndReplace };
