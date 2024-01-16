import React from 'react';

import {
  Box,
  Flex,
  Grid,
  GridItem,
  Option,
  Select,
  ToggleInput,
  Typography,
} from '@strapi/design-system';
import { useCollator } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import { useEnterprise } from '../../../../hooks/useEnterprise';
import { getTranslation } from '../../../utils/translations';

import type { SettingsViewContentTypeLayout } from '../../../utils/layouts';

interface SortOption {
  value: string;
  label: string;
}

interface SettingsProps {
  contentTypeOptions: SettingsViewContentTypeLayout['options'];
  modifiedData: {
    settings: {
      searchable: boolean;
      filterable: boolean;
      bulkable: boolean;
      pageSize: number;
      defaultSortBy: string;
      defaultSortOrder: string;
    };
  } | null;
  onChange: (e: { target: { name: string; value: string | number | boolean } }) => void;
  sortOptions: SortOption[];
}

export const Settings = ({
  contentTypeOptions,
  modifiedData,
  onChange,
  sortOptions: sortOptionsCE = [],
}: SettingsProps) => {
  const { formatMessage, locale } = useIntl();
  const formatter = useCollator(locale, {
    sensitivity: 'base',
  });
  const sortOptions = useEnterprise(
    sortOptionsCE,
    async () => {
      return (
        await import(
          '../../../../../../ee/admin/src/content-manager/pages/ListSettingsView/constants'
        )
      ).REVIEW_WORKFLOW_STAGE_SORT_OPTION_NAME;
    },
    {
      combine(ceOptions, eeOption) {
        return [...ceOptions, { ...eeOption, label: formatMessage(eeOption.label) }];
      },

      defaultValue: sortOptionsCE,

      enabled: !!contentTypeOptions?.reviewWorkflows,
    }
  ) as SortOption[];

  const sortOptionsSorted = sortOptions.sort((a, b) => formatter.compare(a.label, b.label));
  const { settings } = modifiedData ?? {};

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="delta" as="h2">
        {formatMessage({
          id: getTranslation('containers.SettingPage.settings'),
          defaultMessage: 'Settings',
        })}
      </Typography>

      <Flex justifyContent="space-between" gap={4}>
        <Box width="100%">
          <ToggleInput
            label={formatMessage({
              id: getTranslation('form.Input.search'),
              defaultMessage: 'Enable search',
            })}
            onChange={(e) => {
              onChange({ target: { name: 'settings.searchable', value: e.target.checked } });
            }}
            onLabel={formatMessage({
              id: 'app.components.ToggleCheckbox.on-label',
              defaultMessage: 'on',
            })}
            offLabel={formatMessage({
              id: 'app.components.ToggleCheckbox.off-label',
              defaultMessage: 'off',
            })}
            name="settings.searchable"
            checked={settings?.searchable}
          />
        </Box>

        <Box width="100%">
          <ToggleInput
            label={formatMessage({
              id: getTranslation('form.Input.filters'),
              defaultMessage: 'Enable filters',
            })}
            onChange={(e) => {
              onChange({ target: { name: 'settings.filterable', value: e.target.checked } });
            }}
            onLabel={formatMessage({
              id: 'app.components.ToggleCheckbox.on-label',
              defaultMessage: 'on',
            })}
            offLabel={formatMessage({
              id: 'app.components.ToggleCheckbox.off-label',
              defaultMessage: 'off',
            })}
            name="settings.filterable"
            checked={settings?.filterable}
          />
        </Box>

        <Box width="100%">
          <ToggleInput
            label={formatMessage({
              id: getTranslation('form.Input.bulkActions'),
              defaultMessage: 'Enable bulk actions',
            })}
            onChange={(e) => {
              onChange({ target: { name: 'settings.bulkable', value: e.target.checked } });
            }}
            onLabel={formatMessage({
              id: 'app.components.ToggleCheckbox.on-label',
              defaultMessage: 'on',
            })}
            offLabel={formatMessage({
              id: 'app.components.ToggleCheckbox.off-label',
              defaultMessage: 'off',
            })}
            name="settings.bulkable"
            checked={settings?.bulkable}
          />
        </Box>
      </Flex>

      <Grid gap={4}>
        <GridItem s={12} col={6}>
          <Select
            label={formatMessage({
              id: getTranslation('form.Input.pageEntries'),
              defaultMessage: 'Entries per page',
            })}
            hint={formatMessage({
              id: getTranslation('form.Input.pageEntries.inputDescription'),
              defaultMessage:
                'Note: You can override this value in the Collection Type settings page.',
            })}
            onChange={(value) => onChange({ target: { name: 'settings.pageSize', value } })}
            name="settings.pageSize"
            value={settings?.pageSize || ''}
          >
            {[10, 20, 50, 100].map((pageSize) => (
              <Option key={pageSize} value={pageSize}>
                {pageSize}
              </Option>
            ))}
          </Select>
        </GridItem>
        <GridItem s={12} col={3}>
          <Select
            label={formatMessage({
              id: getTranslation('form.Input.defaultSort'),
              defaultMessage: 'Default sort attribute',
            })}
            onChange={(value) => onChange({ target: { name: 'settings.defaultSortBy', value } })}
            name="settings.defaultSortBy"
            value={settings?.defaultSortBy || ''}
          >
            {sortOptionsSorted.map(({ value, label }) => (
              <Option key={value} value={value}>
                {label}
              </Option>
            ))}
          </Select>
        </GridItem>
        <GridItem s={12} col={3}>
          <Select
            label={formatMessage({
              id: getTranslation('form.Input.sort.order'),
              defaultMessage: 'Default sort order',
            })}
            onChange={(value) => onChange({ target: { name: 'settings.defaultSortOrder', value } })}
            name="settings.defaultSortOrder"
            value={settings?.defaultSortOrder || ''}
          >
            {['ASC', 'DESC'].map((order) => (
              <Option key={order} value={order}>
                {order}
              </Option>
            ))}
          </Select>
        </GridItem>
      </Grid>
    </Flex>
  );
};
