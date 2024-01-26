import { Attribute } from '@strapi/types';

interface EnumerationProps extends Omit<InputProps, 'type'> {
  options: Array<{ disabled?: boolean; hidden?: boolean; label?: string; value: string }>;
  type: 'enumeration';
}

/**
 * These props exist on all form inputs, they're not unique to the CM.
 * The concept is that these inputs can be used in a generic renderer that is shared
 * between the numerous forms across Strapi.
 */
interface InputProps {
  disabled?: boolean;
  hint?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type: Exclude<
    Attribute.Kind,
    | 'enumeration'
    | 'media'
    | 'blocks'
    | 'richtext'
    | 'uid'
    | 'dynamiczone'
    | 'uid'
    | 'component'
    | 'relation'
  >;
}

export { EnumerationProps, InputProps };
