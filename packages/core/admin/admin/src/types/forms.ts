import type { DistributiveOmit } from './utils';
import type { InputProps } from '../components/Form';
import type { MessageDescriptor } from 'react-intl';

/**
 * @internal
 * @description We have a lot of forms in the UI where we use translation messages
 * as the props instead of strings, so we use `formatMessage` before we pass the
 * props to the InputRenderer where they're used.
 */
export type InputPropsWithMessageDescriptors = DistributiveOmit<
  InputProps,
  'hint' | 'label' | 'placeholder'
> & {
  hint?: MessageDescriptor;
  label: MessageDescriptor;
  placeholder?: MessageDescriptor;
};

/**
 * @internal
 * @description Form inputs are always displayed in a grid, so we need
 * to use the size property to determine how many columns the input should
 * take up.
 */
export type FormLayoutInputProps = InputPropsWithMessageDescriptors & { size: number };
