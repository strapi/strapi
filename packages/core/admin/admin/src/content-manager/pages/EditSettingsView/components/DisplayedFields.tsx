import { Box, Flex, Typography } from '@strapi/design-system';
import { Menu } from '@strapi/design-system/v2';
import { Plus } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { getTranslation } from '../../../utils/translations';

import { LinkToCTB } from './LinkToCTB';
import { RowsLayout } from './RowsLayout';

interface DisplayedFieldsProps {
  editLayout: any[];
  fields: string[];
  onAddField: (field: string) => void;
  onRemoveField: (rowIndex: number, fieldIndex: number) => void;
}

const DisplayedFields = ({
  editLayout,
  fields,
  onRemoveField,
  onAddField,
}: DisplayedFieldsProps) => {
  const { formatMessage } = useIntl();

  return (
    <Flex direction="column" alignItems="stretch" gap={4}>
      <Flex justifyContent="space-between">
        <div>
          <Box>
            <Typography fontWeight="bold">
              {formatMessage({
                id: getTranslation('containers.ListPage.displayedFields'),
                defaultMessage: 'Displayed fields',
              })}
            </Typography>
          </Box>
          <Box>
            <Typography variant="pi" textColor="neutral600">
              {formatMessage({
                id: 'containers.SettingPage.editSettings.description',
                defaultMessage: 'Drag & drop the fields to build the layout',
              })}
            </Typography>
          </Box>
        </div>
        <LinkToCTB />
      </Flex>
      <Box padding={4} hasRadius borderStyle="dashed" borderWidth="1px" borderColor="neutral300">
        <Flex direction="column" alignItems="stretch" gap={2}>
          {editLayout.map((row, index) => (
            <RowsLayout key={row.rowId} row={row} rowIndex={index} onRemoveField={onRemoveField} />
          ))}
          <Menu.Root>
            <Menu.Trigger
              startIcon={<Plus />}
              endIcon={null}
              disabled={fields.length === 0}
              fullWidth
              variant="secondary"
            >
              {formatMessage({
                id: getTranslation('containers.SettingPage.add.field'),
                defaultMessage: 'Insert another field',
              })}
            </Menu.Trigger>
            <Menu.Content>
              {fields.map((field) => (
                <Menu.Item key={field} onSelect={() => onAddField(field)}>
                  {field}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Root>
        </Flex>
      </Box>
    </Flex>
  );
};

export { DisplayedFields };
