import React from 'react';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import upperFirst from 'lodash/upperFirst';
import { EmptyStateLayout } from '@strapi/design-system/EmptyStateLayout';
import EmptyDocuments from '@strapi/icons/EmptyDocuments';
import { Table, Thead, Tr, Th, Tbody, Td } from '@strapi/design-system/Table';
import { Flex } from '@strapi/design-system/Flex';
import { Typography } from '@strapi/design-system/Typography';
import { Switch } from '@strapi/design-system/Switch';
import getTrad from '../../utils/getTrad';

const ContentTypes = ({ contentTypes, modifiedData, onChange }) => {
  const { formatMessage } = useIntl();
  const rowCount = contentTypes.length;

  if (rowCount === 0) {
    return (
      <EmptyStateLayout
        icon={<EmptyDocuments width={undefined} height={undefined} />}
        content={formatMessage({
          id: getTrad('Settings.list-empty'),
          defaultMessage:
            "You don't have any content yet, we recommend you to create your first Content-Type.",
        })}
      />
    );
  }

  return (
    <Table colCount={2} rowCount={rowCount}>
      <Thead>
        <Tr>
          <Th width="80%">
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTrad('Settings.table.header-name'),
                defaultMessage: 'Name',
              })}
            </Typography>
          </Th>
          <Th width="20%">
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTrad('Settings.table.header-preview'),
                defaultMessage: 'Enable preview',
              })}
            </Typography>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {contentTypes.map(({ info: { singularName }, uid }) => {
          return (
            <Tr key={uid}>
              <Td>
                <Typography fontWeight="semiBold" textColor="neutral800">
                  {upperFirst(singularName)}
                </Typography>
              </Td>
              <Td>
                <Flex>
                  <Switch
                    onLabel={formatMessage({
                      id: 'Settings.content-type.enabled',
                      defaultMessage: 'Enabled',
                    })}
                    offLabel={formatMessage({
                      id: 'Settings.content-type.disabled',
                      defaultMessage: 'Disabled',
                    })}
                    label={`${singularName} ${formatMessage({
                      id: getTrad('Settings.table.th-status'),
                      defaultMessage: 'Status',
                    })}`}
                    selected={modifiedData[uid]}
                    onChange={() => {
                      onChange(uid);
                    }}
                    visibleLabels
                  />
                </Flex>
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

ContentTypes.propTypes = {
  contentTypes: PropTypes.array.isRequired,
  modifiedData: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default ContentTypes;
