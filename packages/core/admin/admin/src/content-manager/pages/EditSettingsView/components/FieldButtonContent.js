import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';
import { Box } from '@strapi/design-system/Box';
import { Flex } from '@strapi/design-system/Flex';
import { IconButton } from '@strapi/design-system/IconButton';
import { Typography } from '@strapi/design-system/Typography';
import Pencil from '@strapi/icons/Pencil';
import Trash from '@strapi/icons/Trash';
import { getTrad } from '../../../utils';
import ComponentFieldList from './ComponentFieldList';
import DynamicZoneList from './DynamicZoneList';

const CustomIconButton = styled(IconButton)`
  background-color: transparent;
  path {
    fill: ${({ theme }) => theme.colors.neutral600};
  }
`;

const FieldButtonContent = ({ attribute, onEditField, onDeleteField, children }) => {
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
                id: getTrad('containers.ListSettingsView.modal-form.edit-label'),
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

FieldButtonContent.defaultProps = {
  attribute: undefined,
};

FieldButtonContent.propTypes = {
  attribute: PropTypes.shape({
    components: PropTypes.array,
    component: PropTypes.string,
    type: PropTypes.string,
  }),
  onEditField: PropTypes.func.isRequired,
  onDeleteField: PropTypes.func.isRequired,
  children: PropTypes.string.isRequired,
};

export default FieldButtonContent;
