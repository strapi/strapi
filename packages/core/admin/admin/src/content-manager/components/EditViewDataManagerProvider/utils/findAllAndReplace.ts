import type { FormattedComponentLayout } from '../../../utils/layouts';
import type { Attribute, Common } from '@strapi/types';

type ReplacementFn<
  TData extends Record<string, any>,
  TKey extends keyof TData,
  TReplacementValue
> = (data: TData[TKey], args: { path: string[]; parent: TData }) => TReplacementValue;

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
 */
const findAllAndReplaceSetup = <
  TReplacementValue,
  TData extends Record<string, any> = Record<string, any>
>(
  components: Record<string, FormattedComponentLayout>,
  predicate: (
    value: FormattedComponentLayout['attributes'][string],
    args: { path: string[]; parent: { [key: string]: Attribute.Any } | Attribute.Any }
  ) => boolean = () => false,
  replacement?: ReplacementFn<TData, keyof TData, TReplacementValue> | TReplacementValue
) => {
  const findAllAndReplace = <TData extends Record<string, any> = Record<string, any>>(
    data: TData,
    attributes: { [key: string]: Attribute.Any },
    {
      ignoreFalseyValues = false,
      path = [],
      parent = attributes,
    }: {
      ignoreFalseyValues?: boolean;
      path?: string[];
      parent?: { [key: string]: Attribute.Any } | Attribute.Any;
    } = {}
  ) => {
    return Object.entries(attributes).reduce<Record<string, any>>(
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
              ? // @ts-expect-error – TODO: Fix this.
                replacement(acc[key], { path: [...path, key], parent: acc })
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
            acc[key] = (
              acc[key] as Attribute.GetValue<Attribute.Component<Common.UID.Component, true>>
            ).map((datum, index) => {
              const data = findAllAndReplace(datum, componentAttributes, {
                ignoreFalseyValues,
                path: [...path, key, index.toString()],
                parent: attributes[key],
              });

              return data;
            });
          }
        } else if (value.type === 'dynamiczone' && Array.isArray(acc[key])) {
          acc[key] = (acc[key] as Attribute.GetValue<Attribute.DynamicZone>).map((datum, index) => {
            const componentAttributes = components[datum.__component].attributes;
            const data = findAllAndReplace(datum, componentAttributes, {
              ignoreFalseyValues,
              path: [...path, key, index.toString()],
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
