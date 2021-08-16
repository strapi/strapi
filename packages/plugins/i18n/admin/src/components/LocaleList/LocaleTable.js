import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  Thead,
  Tr,
  Th,
  Td,
  Tbody,
  Text,
  TableLabel,
  VisuallyHidden,
  Stack,
  IconButton,
} from '@strapi/parts';
import EditIcon from '@strapi/icons/EditIcon';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import DropdownIcon from '@strapi/icons/FilterDropdown';
import styled from 'styled-components';
import orderBy from 'lodash/orderBy';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const ActionIconWrapper = styled.span`
  svg {
    transform: ${({ reverse }) => (reverse ? `rotateX(180deg)` : undefined)};
  }
`;

const SortingKeys = {
  id: 'id',
  name: 'name',
  default: 'isDefault',
};

const SortingOrder = {
  asc: 'asc',
  desc: 'desc',
};

const LocaleTable = ({ locales, onDeleteLocale, onEditLocale }) => {
  const { formatMessage } = useIntl();
  const [sortingKey, setSortingKey] = useState(SortingKeys.id);
  const [sortingOrder, setSortingOrder] = useState(SortingOrder.asc);

  const sortedLocales = orderBy([...locales], [sortingKey], [sortingOrder]);

  const handleSorting = key => {
    if (key === sortingKey) {
      setSortingOrder(prev => (prev === SortingOrder.asc ? SortingOrder.desc : SortingOrder.asc));
    } else {
      setSortingKey(key);
      setSortingOrder(SortingOrder.asc);
    }
  };

  const isReversedArrow = key => sortingKey === key && sortingOrder === SortingOrder.desc;

  return (
    <Table colCount={4} rowCount={sortedLocales.length + 1}>
      <Thead>
        <Tr>
          <Th
            action={
              <IconButton
                label={formatMessage({ id: getTrad('Settings.locales.list.sort.id') })}
                icon={
                  <ActionIconWrapper reverse={isReversedArrow(SortingKeys.id)}>
                    <DropdownIcon />
                  </ActionIconWrapper>
                }
                noBorder
                onClick={() => handleSorting(SortingKeys.id)}
              />
            }
          >
            <TableLabel textColor="neutral600">
              {formatMessage({ id: getTrad('Settings.locales.row.id') })}
            </TableLabel>
          </Th>
          <Th
            action={
              <IconButton
                label={formatMessage({ id: getTrad('Settings.locales.list.sort.displayName') })}
                icon={
                  <ActionIconWrapper reverse={isReversedArrow(SortingKeys.name)}>
                    <DropdownIcon />
                  </ActionIconWrapper>
                }
                noBorder
                onClick={() => handleSorting(SortingKeys.name)}
              />
            }
          >
            <TableLabel textColor="neutral600">
              {formatMessage({ id: getTrad('Settings.locales.row.displayName') })}
            </TableLabel>
          </Th>
          <Th
            action={
              <IconButton
                label={formatMessage({ id: getTrad('Settings.locales.list.sort.default') })}
                icon={
                  <ActionIconWrapper reverse={isReversedArrow(SortingKeys.default)}>
                    <DropdownIcon />
                  </ActionIconWrapper>
                }
                noBorder
                onClick={() => handleSorting(SortingKeys.default)}
              />
            }
          >
            <TableLabel textColor="neutral600">
              {formatMessage({ id: getTrad('Settings.locales.row.default-locale') })}
            </TableLabel>
          </Th>
          <Th>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {sortedLocales.map(locale => (
          <Tr key={locale.id}>
            <Td>
              <Text textColor="neutral800">{locale.id}</Text>
            </Td>
            <Td>
              <Text textColor="neutral800">{locale.name}</Text>
            </Td>
            <Td>
              <Text textColor="neutral800">
                {locale.isDefault
                  ? formatMessage({ id: getTrad('Settings.locales.row.default-locale') })
                  : null}
              </Text>
            </Td>
            <Td>
              <Stack horizontal size={1}>
                {onEditLocale && (
                  <IconButton
                    onClick={() => onEditLocale(locale)}
                    label={formatMessage({ id: getTrad('Settings.list.actions.edit') })}
                    icon={<EditIcon />}
                    noBorder
                  />
                )}
                {onDeleteLocale && !locale.isDefault && (
                  <IconButton
                    onClick={() => onDeleteLocale(locale)}
                    label={formatMessage({ id: getTrad('Settings.list.actions.delete') })}
                    icon={<DeleteIcon />}
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
