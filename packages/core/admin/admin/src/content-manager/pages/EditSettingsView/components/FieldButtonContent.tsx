import { Box, Flex, IconButton, Typography } from '@strapi/design-system';
import { Pencil, Trash } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

import { getTranslation } from '../../../utils/translations';

import { ComponentFieldList } from './ComponentFieldList';
import { DynamicZoneList } from './DynamicZoneList';

import type { Attribute } from '@strapi/types';

const CustomIconButton = styled(IconButton)`
  background-color: transparent;
  path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

interface FieldButtonContentProps {
  attribute?: Attribute.Any;
  onEditField: () => void;
  onDeleteField: () => void;
  children: string;
}

const FieldButtonContent = ({
  attribute,
  onEditField,
  onDeleteField,
  children,
}: FieldButtonContentProps) => {
  const { formatMessage } = useIntl();

  return (
    <Box overflow="hidden" width="100%">
      <Flex paddingLeft={3} alignItems="center" justifyContent="space-between">
        <Typography fontWeight="semiBold" textColor="neutral800" ellipsis>
          {children}
        </Typography>
        <Flex>
          <CustomIconButton
            label={formatMessage(
              {
                id: getTranslation('containers.ListSettingsView.modal-form.edit-label'),
                defaultMessage: `Edit {fieldName}`,
              },
              { fieldName: children }
            )}
            onClick={onEditField}
            icon={<Pencil />}
            noBorder
          />
          <CustomIconButton
            label={formatMessage(
              {
                id: 'global.delete-target',
                defaultMessage: `Delete {target}`,
              },
              {
                target: children,
              }
            )}
            data-testid="delete-field"
            onClick={onDeleteField}
            icon={<Trash />}
            noBorder
          />
        </Flex>
      </Flex>
      {attribute?.type === 'component' && <ComponentFieldList componentUid={attribute.component} />}
      {attribute?.type === 'dynamiczone' && <DynamicZoneList components={attribute.components} />}
    </Box>
  );
};

export { FieldButtonContent };
