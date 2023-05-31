import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import {
  Box,
  Grid,
  GridItem,
  Select,
  Option,
  ToggleInput,
  Typography,
  Flex,
} from '@strapi/design-system';
import { getTrad } from '../../../utils';

const Settings = ({ modifiedData, onChange, sortOptions }) => {
  const { formatMessage } = useIntl();
  const { settings, metadatas } = modifiedData;

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Typography variant="delta" as="h2">
        {formatMessage({
          id: getTrad('containers.SettingPage.settings'),
          defaultMessage: 'Settings',
        })}
      </Typography>

      <Flex justifyContent="space-between" gap={4}>
        <Box width="100%">
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
        </Box>

        <Box width="100%">
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
        </Box>

        <Box width="100%">
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
        </Box>
      </Flex>

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
    </Flex>
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
