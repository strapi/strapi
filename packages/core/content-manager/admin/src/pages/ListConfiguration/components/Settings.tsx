import * as React from 'react';

import { useForm, InputRenderer, type InputProps } from '@strapi/admin/strapi-admin';
import { Flex, Grid, Typography, useCollator } from '@strapi/design-system';
import { type MessageDescriptor, useIntl } from 'react-intl';

import { useDoc } from '../../../hooks/useDocument';
import { type EditFieldLayout } from '../../../hooks/useDocumentLayout';
import { getTranslation } from '../../../utils/translations';
import { type FormData } from '../ListConfigurationPage';

import type { DistributiveOmit } from 'react-redux';

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

const EXCLUDED_SORT_ATTRIBUTE_TYPES = [
  'media',
  'richtext',
  'dynamiczone',
  'relation',
  'component',
  'json',
  'blocks',
];

interface SortOption {
  value: string;
  label: string;
}

const Settings = () => {
  const { formatMessage, locale } = useIntl();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });
  const { schema } = useDoc();

  const layout = useForm<FormData['layout']>('Settings', (state) => state.values.layout ?? []);
  const currentSortBy = useForm<FormData['settings']['defaultSortBy']>(
    'Settings',
    (state) => state.values.settings.defaultSortBy
  );
  const onChange = useForm('Settings', (state) => state.onChange);

  const sortOptions = React.useMemo(
    () =>
      Object.values(layout).reduce<SortOption[]>((acc, field) => {
        if (schema && !EXCLUDED_SORT_ATTRIBUTE_TYPES.includes(schema.attributes[field.name].type)) {
          acc.push({
            value: field.name,
            label: typeof field.label !== 'string' ? formatMessage(field.label) : field.label,
          });
        }

        return acc;
      }, []),
    [formatMessage, layout, schema]
  );

  const sortOptionsSorted = sortOptions.sort((a, b) => formatter.compare(a.label, b.label));

  React.useEffect(() => {
    if (sortOptionsSorted.findIndex((opt) => opt.value === currentSortBy) === -1) {
      onChange('settings.defaultSortBy', sortOptionsSorted[0]?.value);
    }
  }, [currentSortBy, onChange, sortOptionsSorted]);

  const formLayout = React.useMemo(
    () =>
      SETTINGS_FORM_LAYOUT.map((row) =>
        row.map((field) => {
          if (field.type === 'enumeration') {
            return {
              ...field,
              hint: field.hint ? formatMessage(field.hint) : undefined,
              label: formatMessage(field.label),
              options: field.name === 'settings.defaultSortBy' ? sortOptionsSorted : field.options,
            };
          } else {
            return {
              ...field,
              hint: field.hint ? formatMessage(field.hint) : undefined,
              label: formatMessage(field.label),
            };
          }
        })
      ) as [top: EditFieldLayout[], bottom: EditFieldLayout[]],
    [formatMessage, sortOptionsSorted]
  );

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="delta" tag="h2">
        {formatMessage({
          id: getTranslation('containers.SettingPage.settings'),
          defaultMessage: 'Settings',
        })}
      </Typography>
      <Grid.Root key="bottom" gap={4}>
        {formLayout.map((row) =>
          row.map(({ size, ...field }) => (
            <Grid.Item key={field.name} s={12} col={size} direction="column" alignItems="stretch">
              {/* @ts-expect-error – issue with EnumerationProps conflicting with InputProps */}
              <InputRenderer {...field} />
            </Grid.Item>
          ))
        )}
      </Grid.Root>
    </Flex>
  );
};

const SETTINGS_FORM_LAYOUT: FormLayoutInputProps[][] = [
  [
    {
      label: {
        id: getTranslation('form.Input.search'),
        defaultMessage: 'Enable search',
      },
      name: 'settings.searchable',
      size: 4,
      type: 'boolean' as const,
    },
    {
      label: {
        id: getTranslation('form.Input.filters'),
        defaultMessage: 'Enable filters',
      },
      name: 'settings.filterable',
      size: 4,
      type: 'boolean' as const,
    },
    {
      label: {
        id: getTranslation('form.Input.bulkActions'),
        defaultMessage: 'Enable bulk actions',
      },
      name: 'settings.bulkable',
      size: 4,
      type: 'boolean' as const,
    },
  ],
  [
    {
      hint: {
        id: getTranslation('form.Input.pageEntries.inputDescription'),
        defaultMessage: 'Note: You can override this value in the Collection Type settings page.',
      },
      label: {
        id: getTranslation('form.Input.pageEntries'),
        defaultMessage: 'Entries per page',
      },
      name: 'settings.pageSize',
      options: ['10', '20', '50', '100'].map((value) => ({ value, label: value })),
      size: 6,
      type: 'enumeration' as const,
    },
    {
      label: {
        id: getTranslation('form.Input.defaultSort'),
        defaultMessage: 'Default sort attribute',
      },
      name: 'settings.defaultSortBy',
      options: [],
      size: 3,
      type: 'enumeration' as const,
    },
    {
      label: {
        id: getTranslation('form.Input.sort.order'),
        defaultMessage: 'Default sort order',
      },
      name: 'settings.defaultSortOrder',
      options: ['ASC', 'DESC'].map((value) => ({ value, label: value })),
      size: 3,
      type: 'enumeration' as const,
    },
  ],
];

export { Settings };
