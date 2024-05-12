import {
  Flex,
  IconButton,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { onRowClick } from '@strapi/helper-plugin';
import { Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { Locale } from '../store/reducers';
import { getTranslation } from '../utils/getTranslation';

type LocaleTableProps = {
  locales?: Locale[];
  canDelete?: boolean;
  canEdit?: boolean;
  onDeleteLocale: (locale: Locale) => void;
  onEditLocale: (locale: Locale) => void;
};

const LocaleTable = ({
  locales = [],
  onDeleteLocale,
  onEditLocale,
  canDelete = true,
  canEdit = true,
}: LocaleTableProps) => {
  const { formatMessage } = useIntl();

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
          <Tr
            key={locale.id}
            {...onRowClick({
              fn: () => onEditLocale(locale),
              condition: Boolean(onEditLocale),
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
                  ? formatMessage({
                      id: getTranslation('Settings.locales.default'),
                      defaultMessage: 'Default',
                    })
                  : null}
              </Typography>
            </Td>
            <Td>
              <Flex gap={1} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
                {canEdit && (
                  <IconButton
                    onClick={() => onEditLocale(locale)}
                    label={formatMessage({
                      id: getTranslation('Settings.list.actions.edit'),
                      defaultMessage: 'Edit',
                    })}
                    icon={<Pencil />}
                    borderWidth={0}
                  />
                )}
                {canDelete && !locale.isDefault && (
                  <IconButton
                    onClick={() => onDeleteLocale(locale)}
                    label={formatMessage({
                      id: getTranslation('Settings.list.actions.delete'),
                      defaultMessage: 'Delete',
                    })}
                    icon={<Trash />}
                    borderWidth={0}
                  />
                )}
              </Flex>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
};

export { LocaleTable };
export type { LocaleTableProps };
