import React from 'react';
import PropTypes from 'prop-types';
import {
  Typography,
  IconButton,
  Stack,
  VisuallyHidden,
  Table,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
} from '@strapi/design-system';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import { useIntl } from 'react-intl';
import { stopPropagation, onRowClick } from '@strapi/helper-plugin';

import { getTrad } from '../../utils';

const LocaleTable = ({ locales, onDeleteLocale, onEditLocale }) => {
  const { formatMessage } = useIntl();

  return (
    <Table colCount={4} rowCount={locales.length + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({ id: getTrad('Settings.locales.row.id') })}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({ id: getTrad('Settings.locales.row.displayName') })}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({ id: getTrad('Settings.locales.row.default-locale') })}
            </Typography>
          </Th>
          <Th>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {locales.map((locale) => (
          <Tr
            key={locale.id}
            {...onRowClick({
              fn: () => onEditLocale(locale),
              condition: onEditLocale,
            })}
          >
            <Td>
              <Typography textColor="neutral800">{locale.id}</Typography>
            </Td>
            <Td>
              <Typography textColor="neutral800">{locale.name}</Typography>
            </Td>
            <Td>
              <Typography textColor="neutral800">
                {locale.isDefault
                  ? formatMessage({ id: getTrad('Settings.locales.default') })
                  : null}
              </Typography>
            </Td>
            <Td>
              <Stack
                horizontal
                spacing={1}
                style={{ justifyContent: 'flex-end' }}
                {...stopPropagation}
              >
                {onEditLocale && (
                  <IconButton
                    onClick={() => onEditLocale(locale)}
                    label={formatMessage({ id: getTrad('Settings.list.actions.edit') })}
                    icon={<Pencil />}
                    noBorder
                  />
                )}
                {onDeleteLocale && !locale.isDefault && (
                  <IconButton
                    onClick={() => onDeleteLocale(locale)}
                    label={formatMessage({ id: getTrad('Settings.list.actions.delete') })}
                    icon={<Trash />}
                    noBorder
                  />
                )}
              </Stack>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

LocaleTable.defaultProps = {
  locales: [],
  onDeleteLocale: undefined,
  onEditLocale: undefined,
};

LocaleTable.propTypes = {
  locales: PropTypes.array,
  onDeleteLocale: PropTypes.func,
  onEditLocale: PropTypes.func,
};

export default LocaleTable;
