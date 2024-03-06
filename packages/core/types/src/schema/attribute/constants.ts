import type { Attribute } from '..';

/**
 * Union of every populatable attribute's types extracted from {@link AttributeByName.Kind}.
 *
 * Populatable attributes are those whose value needs to be populated in order to make it to the final value, such as `relation`, `dynamiczone`, `component` or `media`.
 */
export type PopulatableKind = Extract<
  Attribute.Kind,
  'relation' | 'component' | 'dynamiczone' | 'media'
>;

/**
 * Union of every non-populatable attribute's types extracted from {@link AttributeByName.Kind}.
 */
export type NonPopulatableKind = Exclude<
  Attribute.Kind,
  'relation' | 'component' | 'dynamiczone' | 'media'
>;
