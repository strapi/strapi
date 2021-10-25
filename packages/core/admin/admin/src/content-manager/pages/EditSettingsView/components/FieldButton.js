import React from 'react';
import styled from 'styled-components';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Flex } from '@strapi/parts/Flex';
import { IconButton } from '@strapi/parts/IconButton';
import Drag from '@strapi/icons/Drag';
import EditIcon from '@strapi/icons/EditIcon';
import DeleteIcon from '@strapi/icons/DeleteIcon';
import { useIntl } from 'react-intl';
import ComponentFieldList from './ComponentFieldList';
import DynamicZoneList from './DynamicZoneList';
import getTrad from '../../../utils/getTrad';

const CustomIconButton = styled(IconButton)`
  background-color: transparent;
`;
const CustomDragIcon = styled(Drag)`
  height: ${12 / 16}rem;
  width: ${12 / 16}rem;
`;
const CustomFlex = styled(Flex)`
  border-right: 1px solid ${({ theme }) => theme.colors.neutral200};
`;

const FieldButton = ({ attribute, onEditField, onDeleteField, children }) => {
  const { formatMessage } = useIntl();
  const getHeight = () => {
    const higherFields = ['json', 'text', 'file', 'media', 'component', 'richtext', 'dynamiczone'];

    if (attribute && higherFields.includes(attribute.type)) {
      return '74px';
    }

    return '32px';
  };

  return (
    <Flex
      width="100%"
      borderColor="neutral150"
      hasRadius
      background="neutral100"
      minHeight={getHeight()}
      alignItems="stretch"
    >
      <CustomFlex alignItems="center" paddingLeft={3} paddingRight={3}>
        <CustomDragIcon />
      </CustomFlex>
      <Box overflow="hidden" width="100%">
        <Flex paddingLeft={3} alignItems="baseline" justifyContent="space-between">
          <Box>{children}</Box>
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
              icon={<EditIcon />}
              noBorder
            />
            <CustomIconButton
              label={formatMessage(
                {
                  id: getTrad('app.component.table.delete'),
                  defaultMessage: `Delete {target}`,
                },
                {
                  target: children,
                }
              )}
              onClick={onDeleteField}
              icon={<DeleteIcon />}
              noBorder
            />
          </Flex>
        </Flex>
        {attribute?.type === 'component' && (
          <ComponentFieldList componentUid={attribute.component} />
        )}
        {attribute?.type === 'dynamiczone' && <DynamicZoneList components={attribute.components} />}
      </Box>
    </Flex>
  );
};

FieldButton.defaultProps = {
  attribute: undefined,
};

FieldButton.propTypes = {
  attribute: PropTypes.shape({
    components: PropTypes.array,
    component: PropTypes.string,
    type: PropTypes.string,
  }),
  onEditField: PropTypes.func.isRequired,
  onDeleteField: PropTypes.func.isRequired,
  children: PropTypes.string.isRequired,
};

export default FieldButton;
