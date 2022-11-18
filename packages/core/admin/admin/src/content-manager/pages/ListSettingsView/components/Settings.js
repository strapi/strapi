import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { useIntl } from 'react-intl';
import {
  Flex,
  Grid,
  GridItem,
  Select,
  Option,
  ToggleInput,
  Box,
  Typography,
} from '@strapi/design-system';
import { getTrad } from '../../../utils';

const FlexGap = styled(Flex)`
  gap: ${({ theme }) => theme.spaces[4]};
`;

const Settings = ({ modifiedData, onChange, sortOptions }) => {
  const { formatMessage } = useIntl();
  const { settings, metadatas } = modifiedData;

  return (
    <>
      <Box paddingBottom={4}>
        <Typography variant="delta" as="h2">
          {formatMessage({
            id: getTrad('containers.SettingPage.settings'),
            defaultMessage: 'Settings',
          })}
        </Typography>
      </Box>
      <FlexGap justifyContent="space-between" wrap="wrap" paddingBottom={6}>
        <ToggleInput
          label={formatMessage({
            id: getTrad('form.Input.search'),
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
          checked={settings.searchable}
        />
        <ToggleInput
          label={formatMessage({
            id: getTrad('form.Input.filters'),
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
          checked={settings.filterable}
        />
        <ToggleInput
          label={formatMessage({
            id: getTrad('form.Input.bulkActions'),
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
          checked={settings.bulkable}
        />
      </FlexGap>
      <Grid gap={4}>
        <GridItem s={12} col={6}>
          <Select
            label={formatMessage({
              id: getTrad('form.Input.pageEntries'),
              defaultMessage: 'Entries per page',
            })}
            hint={formatMessage({
              id: getTrad('form.Input.pageEntries.inputDescription'),
              defaultMessage:
                'Note: You can override this value in the Collection Type settings page.',
            })}
            onChange={(value) => onChange({ target: { name: 'settings.pageSize', value } })}
            name="settings.pageSize"
            value={modifiedData.settings.pageSize || ''}
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
              id: getTrad('form.Input.defaultSort'),
              defaultMessage: 'Default sort attribute',
            })}
            onChange={(value) => onChange({ target: { name: 'settings.defaultSortBy', value } })}
            name="settings.defaultSortBy"
            value={modifiedData.settings.defaultSortBy || ''}
          >
            {sortOptions.map((sortBy) => (
              <Option key={sortBy} value={sortBy}>
                {metadatas[sortBy].list.label || sortBy}
              </Option>
            ))}
          </Select>
        </GridItem>
        <GridItem s={12} col={3}>
          <Select
            label={formatMessage({
              id: getTrad('form.Input.sort.order'),
              defaultMessage: 'Default sort order',
            })}
            onChange={(value) => onChange({ target: { name: 'settings.defaultSortOrder', value } })}
            name="settings.defaultSortOrder"
            value={modifiedData.settings.defaultSortOrder || ''}
          >
            {['ASC', 'DESC'].map((order) => (
              <Option key={order} value={order}>
                {order}
              </Option>
            ))}
          </Select>
        </GridItem>
      </Grid>
    </>
  );
};

Settings.defaultProps = {
  modifiedData: {},
  sortOptions: [],
};

Settings.propTypes = {
  modifiedData: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  sortOptions: PropTypes.array,
};

export default Settings;
