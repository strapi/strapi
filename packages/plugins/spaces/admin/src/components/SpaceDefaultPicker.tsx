import {
  Box,
  Field,
  Flex,
  MultiSelect,
  MultiSelectOption,
  Typography,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useGetMineSpacesQuery } from '../services/spaces';
import { getTranslation } from '../utils/getTranslation';

interface SpaceDefaultPickerProps {
  /** Slugs of the spaces this locale is the default in. */
  value: string[];
  onChange: (next: string[]) => void;
}

/**
 * "Default in spaces" multi-select on the locale create/edit form. Unlike
 * `SpaceVisibilityField`, an empty selection means *nothing* here (the locale is
 * simply not a per-space default anywhere) — there is no platform-wide semantic
 * to normalize to. The parent form section keeps this value consistent with the
 * visibility binding (a locale can only be the default of a space it's bound to,
 * and picking a space here auto-adds it to the binding).
 */
export const SpaceDefaultPicker = ({ value, onChange }: SpaceDefaultPickerProps) => {
  const { formatMessage } = useIntl();
  const { data: spaces, isLoading } = useGetMineSpacesQuery();

  if (isLoading || !spaces || spaces.length < 2) {
    return null;
  }

  return (
    <Field.Root
      width="100%"
      hint={formatMessage({
        id: getTranslation('defaultPicker.hint'),
        defaultMessage:
          'Pick one or more spaces this locale should be the default in. Picking a space here also adds it to "Available in spaces" automatically.',
      })}
    >
      <Field.Label>
        {formatMessage({
          id: getTranslation('defaultPicker.label'),
          defaultMessage: 'Default in spaces',
        })}
      </Field.Label>
      <MultiSelect
        value={value}
        onChange={(next) => onChange(next as string[])}
        placeholder={formatMessage({
          id: getTranslation('defaultPicker.placeholder'),
          defaultMessage: 'Not the default in any space',
        })}
        withTags
      >
        {spaces.map((space) => (
          <MultiSelectOption key={space.slug} value={space.slug}>
            <Flex alignItems="center" gap={2}>
              <Box
                width="8px"
                height="8px"
                borderRadius="50%"
                background={space.color ?? 'neutral300'}
                shrink={0}
              />
              <Typography variant="omega">{space.name}</Typography>
            </Flex>
          </MultiSelectOption>
        ))}
      </MultiSelect>
      <Field.Hint />
    </Field.Root>
  );
};
