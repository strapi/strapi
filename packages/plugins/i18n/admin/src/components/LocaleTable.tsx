import * as React from 'react';

import {
  Flex,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { getTranslation } from '../utils/getTranslation';

import { DeleteLocale } from './DeleteLocale';
import { EditLocale, EditModal } from './EditLocale';

import type { Locale } from '../../../shared/contracts/locales';

/* -------------------------------------------------------------------------------------------------
 * LocaleTable
 * -----------------------------------------------------------------------------------------------*/

type LocaleTableProps = {
  locales?: Locale[];
  canDelete?: boolean;
  canUpdate?: boolean;
  onDeleteLocale?: (locale: Locale) => void;
  onEditLocale?: (locale: Locale) => void;
};

const LocaleTable = ({ locales = [], canDelete, canUpdate }: LocaleTableProps) => {
  const [editLocaleId, setEditLocaleId] = React.useState<Locale['id']>();
  const { formatMessage } = useIntl();

  const handleClick = (localeId: Locale['id']) => () => {
    if (canUpdate) {
      setEditLocaleId(localeId);
    }
  };

  return (
    <Table colCount={4} rowCount={locales.length + 1}>
      <Thead>
        <Tr>
          <Th>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTranslation('Settings.locales.row.id'),
                defaultMessage: 'ID',
              })}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTranslation('Settings.locales.row.displayName'),
                defaultMessage: 'Display name',
              })}
            </Typography>
          </Th>
          <Th>
            <Typography variant="sigma" textColor="neutral600">
              {formatMessage({
                id: getTranslation('Settings.locales.row.default-locale'),
                defaultMessage: 'Default locale',
              })}
            </Typography>
          </Th>
          <Th>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        </Tr>
      </Thead>
      <Tbody>
        {locales.map((locale) => (
          <React.Fragment key={locale.id}>
            <Tr
              onClick={handleClick(locale.id)}
              style={{ cursor: canUpdate ? 'pointer' : 'default' }}
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
                    ? formatMessage({
                        id: getTranslation('Settings.locales.default'),
                        defaultMessage: 'Default',
                      })
                    : null}
                </Typography>
              </Td>
              <Td>
                <Flex gap={1} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                  {canUpdate && <EditLocale {...locale} />}
                  {canDelete && !locale.isDefault && <DeleteLocale {...locale} />}
                </Flex>
              </Td>
            </Tr>
            <EditModal
              {...locale}
              onOpenChange={() => setEditLocaleId(undefined)}
              open={editLocaleId === locale.id}
            />
          </React.Fragment>
        ))}
      </Tbody>
    </Table>
  );
};

export { LocaleTable };
export type { LocaleTableProps };
