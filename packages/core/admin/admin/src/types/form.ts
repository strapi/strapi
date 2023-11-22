import { GridItemProps } from '@strapi/design-system';
import { GenericInputProps } from '@strapi/helper-plugin';

interface FormLayout
  extends Pick<GenericInputProps, 'intlLabel' | 'name' | 'type'>,
    Partial<Pick<GenericInputProps, 'placeholder' | 'autoComplete' | 'required'>> {
  size: Pick<GridItemProps, 'xs' | 'col'>;
}

export { FormLayout };
