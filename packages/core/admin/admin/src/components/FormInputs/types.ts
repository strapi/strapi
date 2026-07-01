import type { ComponentPropsWithoutRef, FocusEventHandler, ReactNode } from 'react';

import type { Schema } from '@strapi/types';

interface EnumerationProps extends Omit<InputProps, 'options' | 'type'> {
  options: Array<{ disabled?: boolean; hidden?: boolean; label?: string; value: string }>;
  type: 'enumeration';
}

interface StringProps
  extends Omit<InputProps, 'autoComplete' | 'type'>,
    Pick<ComponentPropsWithoutRef<'input'>, 'autoComplete'> {
  type: Extract<Schema.Attribute.Kind, 'text' | 'string' | 'password' | 'email'>;
  /**
   * Optional focus handler. Some consumers (e.g. the Content Manager's
   * live-preview) pass this through to the underlying input.
   */
  onFocus?: FocusEventHandler<HTMLElement>;
}

/**
 * These props exist on all form inputs, they're not unique to the CM.
 * The concept is that these inputs can be used in a generic renderer that is shared
 * between the numerous forms across Strapi.
 */
interface InputProps {
  'aria-label'?: string;
  autoComplete?: never;
  disabled?: boolean;
  hint?: ReactNode;
  label?: ReactNode;
  labelAction?: ReactNode;
  name: string;
  placeholder?: string;
  required?: boolean;
  options?: never;
  type:
    | Exclude<
        Schema.Attribute.Kind,
        | 'enumeration'
        | 'media'
        | 'blocks'
        | 'richtext'
        | 'dynamiczone'
        | 'component'
        | 'relation'
        | 'text'
        | 'string'
        | 'password'
        | 'email'
      >
    | 'checkbox';
}

export type { EnumerationProps, InputProps, StringProps };
